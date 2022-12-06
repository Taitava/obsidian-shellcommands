/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {
    ChildProcess,
    spawn,
    SpawnOptions,
} from "child_process";
import {
    cloneObject,
    getOperatingSystem,
    getVaultAbsolutePath,
} from "./Common";
import * as path from "path";
import * as fs from "fs";
import {
    handleBufferedOutput,
    startRealtimeOutputHandling,
} from "./output_channels/OutputChannelFunctions";
import {ShellCommandParsingProcess, ShellCommandParsingResult, TShellCommand} from "./TShellCommand";
import {UnecognisedShellError} from "./shells/ShellFunctions";
import {debugLog} from "./Debug";
import {SC_Event} from "./events/SC_Event";
import {
    ConfirmationModal,
    convertNewlinesToPATHSeparators,
    getPATHEnvironmentVariableName,
    Preaction,
} from "./imports";
import SC_Plugin from "./main";
import {
    ExecutionNotificationMode,
    PlatformNames,
} from "./settings/SC_MainSettings";
import {
    OutputChannelCode,
    OutputChannelCodes,
    OutputStream,
} from "./output_channels/OutputChannelCode";
import {Readable} from "stream";
import {Notice} from "obsidian";
import {OutputChannel} from "./output_channels/OutputChannel";
import {ParsingResult} from "./variables/parseVariables";
import {Shell} from "./shells/Shell";

export class ShellCommandExecutor {

    constructor(
        private plugin: SC_Plugin,
        private t_shell_command: TShellCommand,

        /** Needed for Preactions to be able to access all variables, in case any variables are used by a Preaction. Use null, if the shell command execution happens outside of any event context. */
        private sc_event: SC_Event | null,
    ) {}

    /**
     * Performs preactions, and if they all give resolved Promises, executes the shell command.
     */
    public async doPreactionsAndExecuteShellCommand(parsing_process?: ShellCommandParsingProcess, overriding_output_channel?: OutputChannelCode) {
        const preactions = this.t_shell_command.getPreactions();

        // Does an already started ParsingProcess exist?
        if (!parsing_process) {
            // No ParsingProcess yet.
            // Create one and parse all variables that are safe to parse before preactions.
            debugLog("Going to prepare possible Preactions, but will first start a variable parsing process. Depending on possible Preactions, this might not yet parse all variables.");
            parsing_process = this.t_shell_command.createParsingProcess(this.sc_event);
            // Parse the first set of variables, not all sets.
            if (!await parsing_process.process()) {
                // Some errors happened.
                debugLog("Will not prepare possible Preactions, because the parsing process failed. Will cancel shell command execution.");
                parsing_process.displayErrorMessages();
                return;
            }
        } else {
            debugLog("Going to prepare possible Preactions with an already started variable parsing process.");
        }

        // Create a pipeline for preactions.
        let preaction_pipeline = Promise.resolve(true); // Will contain a series of preaction performs.

        // Confirm execution from a user, if needed.
        // I haven't decided yet if I want to move this to be its own Preaction subclass. Might make sense, but requires configuration migration.
        if (this.t_shell_command.getConfiguration().confirm_execution) {
            preaction_pipeline = preaction_pipeline.then(() => {
                debugLog("Asking a confirmation from a user to execute shell command #" + this.t_shell_command.getId());
                return new Promise((resolve, reject) => {
                    const confirmation_modal = new ConfirmationModal(
                        this.plugin,
                        this.t_shell_command.getAliasOrShellCommand(),
                        "Execute this shell command?",
                        "Yes, execute",
                    );
                    confirmation_modal.open();
                    confirmation_modal.promise.then((execution_confirmed: boolean) => {
                        if (execution_confirmed) {
                            // The PromptModal has been closed.
                            // Check if user wanted to execute the shell command or cancel.
                            if (execution_confirmed) {
                                // User wants to execute.
                                debugLog("User confirmed to execute shell command #" + this.t_shell_command.getId());
                                resolve(true);
                            } else {
                                // User wants to cancel.
                                debugLog("User cancelled execution of shell command #" + this.t_shell_command.getId());
                                resolve(false);
                            }
                        }
                    });
                });

            });
        }

        // Perform preactions
        preactions.forEach((preaction: Preaction) => {
            debugLog(`Adding Preaction of type '${preaction.configuration.type}' to pipeline.`);
            preaction_pipeline = preaction_pipeline.then(() => {
                debugLog(`Calling Preaction of type '${preaction.configuration.type}'.`);
                if (!parsing_process) {
                    // Should have a ParsingProcess at this point.
                    throw new Error("No parsing process. Cannot do preaction.");
                }
                return preaction.perform(parsing_process, this.sc_event);
            });
        });
        if (0 === preactions.length) {
            debugLog("No Preactions to perform. This is ok.");
        }

        preaction_pipeline.then(async (can_execute: boolean) => {
            if (can_execute) {
                // Parse either all variables, or if some variables are already parsed, then just the rest. Might also be that
                // all variables are already parsed.
                debugLog("Parsing all the rest of the variables (if there are any left).");
                if (!parsing_process) {
                    // Should have a ParsingProcess at this point.
                    throw new Error("No parsing process. Cannot execute shell command.");
                }
                if (await parsing_process.processRest()) {
                    // Parsing the rest of the variables succeeded
                    // Execute the shell command.
                    const parsing_results = parsing_process.getParsingResults();
                    const shell_command_parsing_result: ShellCommandParsingResult = {
                        shell_command: (parsing_results["shell_command"] as ParsingResult).parsed_content as string,
                        alias: (parsing_results["alias"] as ParsingResult).parsed_content as string,
                        environment_variable_path_augmentation: (parsing_results.environment_variable_path_augmentation as ParsingResult).parsed_content as string,
                        output_wrapper_stdout: parsing_results.output_wrapper_stdout?.parsed_content as string, // Output wrappers are not always present. If they are absent, use undefined.
                        output_wrapper_stderr: parsing_results.output_wrapper_stderr?.parsed_content as string,
                        succeeded: true,
                        error_messages: [],
                    };
                    debugLog("Will call ShellCommandExecutor.executeShellCommand().");
                    this.executeShellCommand(shell_command_parsing_result, overriding_output_channel);
                } else {
                    // Parsing has failed.
                    debugLog("Parsing the rest of the variables failed.")
                    parsing_process.displayErrorMessages();
                }
            } else {
                // Cancel execution
                debugLog("Shell command execution cancelled.")
            }
        });


    }

    /**
     * Does not ask for confirmation before execution. This should only be called if: a) a confirmation is already asked from a user, or b) this command is defined not to need a confirmation.
     * Use confirmAndExecuteShellCommand() instead to have a confirmation asked before the execution.
     *
     * @param shell_command_parsing_result The actual shell command that will be executed is taken from this object's '.shell_command' property.
     * @param overriding_output_channel Optional. If specified, all output streams will be directed to this output channel. Otherwise, output channels are determined from this.t_shell_command.
     */
    private executeShellCommand(shell_command_parsing_result: ShellCommandParsingResult, overriding_output_channel?: OutputChannelCode): void {
        const working_directory = this.getWorkingDirectory();

        // Define output channels
        let outputChannels = this.t_shell_command.getOutputChannels();
        if (overriding_output_channel) {
            // Ignore the shell command's normal channels and use temporarily something else.
           outputChannels = {
               'stdout': overriding_output_channel,
               'stderr': overriding_output_channel,
           }
        }

        // Check that the shell command is not empty
        const shell_command = shell_command_parsing_result.shell_command.trim();
        if (!shell_command.length) {
            // It is empty
            const error_message = this.getErrorMessageForEmptyShellCommand();
            debugLog(error_message);
            this.plugin.newError(error_message);
            return;
        }

        // Check that the currently defined shell is supported by this plugin. If using system default shell, it's possible
        // that the shell is something that is not supported. Also, the settings file can be edited manually, and incorrect
        // shell can be written there.
        let shell: Shell
        try {
           shell = this.t_shell_command.getShell();
        } catch (error) {
            if (error instanceof UnecognisedShellError) {
                // The shell is not supported.
                const shellIdentifier: string | undefined = this.t_shell_command.getShellIdentifier();
                debugLog("Shell is not supported: " + shellIdentifier);
                this.plugin.newError("This plugin does not support the following shell: " + shellIdentifier);
            } else {
                // Rethrow some other error.
                throw error;
            }
            return;
        }

        // Define an object for environment variables.
        const environment_variables = cloneObject<typeof process.env>(process.env); // Need to clone process.env, otherwise the modifications below will be stored permanently until Obsidian is hard-restarted (= closed and launched again).

        // Augment the PATH environment variable (if wanted)
        const augmented_path = this.augmentPATHEnvironmentVariable(shell_command_parsing_result.environment_variable_path_augmentation, shell);
        if (augmented_path.length > 0) {
            environment_variables[getPATHEnvironmentVariableName()] = augmented_path;
        }

        // Check that the working directory exists and is a folder
        if (!fs.existsSync(working_directory)) {
            // Working directory does not exist
            // Prevent execution
            debugLog("Working directory does not exist: " + working_directory);
            this.plugin.newError("Working directory does not exist: " + working_directory);
        }
        else if (!fs.lstatSync(working_directory).isDirectory()) {
            // Working directory is not a directory.
            // Prevent execution
            debugLog("Working directory exists but is not a folder: " + working_directory);
            this.plugin.newError("Working directory exists but is not a folder: " + working_directory);
        } else {
            // Working directory is OK
            // Prepare execution options
            const options: SpawnOptions = {
                "cwd": working_directory,
                "shell": shell.getBinaryPath(),
                "env": environment_variables,
            };

            // Execute the shell command
            debugLog("Executing command " + shell_command + " in " + working_directory + "...");
            try {
                const child_process = spawn(shell_command, options);

                // Common error handling regardless of output handling mode
                child_process.on("error", (error: Error) => {
                    // Probably most errors will NOT end up here, I guess this event occurs for some rare errors.
                    //
                    // A quote from https://nodejs.org/api/child_process.html#event-error (read 2022-10-29):
                    // > The 'error' event is emitted whenever:
                    // > - The process could not be spawned, or
                    // > - The process could not be killed, or
                    // > - Sending a message to the child process failed.

                    debugLog("Shell command failed to execute: Received a non-stderr error message: " + error.message);
                    this.plugin.newError("Shell command failed to execute. Error: " + error.message);
                });

                // Define output encoding
                if (null === child_process.stdout || null == child_process.stderr) {
                    // The exception is caught locally below, but it's ok because it's then rethrown as the error message does not match '/spawn\s+ENAMETOOLONG/i'.
                    throw new Error("Child process's stdout and/or stderr stream is null.");
                }
                child_process.stdout.setEncoding("utf8"); // Receive stdout and ...
                child_process.stderr.setEncoding("utf8"); // ... stderr as strings, not as Buffer objects.

                // Define a terminator
                const processTerminator = () => {
                    child_process.kill("SIGTERM");
                };

                // Hook into child_process for output handling
                switch (this.t_shell_command.getOutputHandlingMode()) {
                    case "buffered": {
                        // Output will be buffered and handled as a single batch.
                        this.handleBufferedOutput(child_process, shell_command_parsing_result, outputChannels);
                        break;
                    }

                    case "realtime": {
                        // Output will be handled on-the-go.
                        this.handleRealtimeOutput(child_process, shell_command_parsing_result, outputChannels, processTerminator);
                    }
                }

                // Display a notification of the execution (if wanted).
                if ("disabled" !== this.plugin.settings.execution_notification_mode) {
                    this.showExecutionNotification(child_process, shell_command, this.plugin.settings.execution_notification_mode, processTerminator);
                }
            } catch (exception) {
                // An exception has happened.
                // Check if the shell command was too long.
                if (exception.message.match(/spawn\s+ENAMETOOLONG/i)) {
                    // It was too long. Show an error message.
                    this.plugin.newError("Shell command execution failed because it's too long: " + shell_command.length + " characters. (Unfortunately the max limit is unknown).");
                } else {
                    // The shell command was not too long, this exception is about something else.
                    // Rethrow the exception.
                    throw  exception;
                }
            }
        }
    }

    private handleBufferedOutput(child_process: ChildProcess, shell_command_parsing_result: ShellCommandParsingResult, outputChannels: OutputChannelCodes) {
        child_process.on("exit", (exitCode: number | null) => {
            // exitCode is null if user terminated the process. Reference: https://nodejs.org/api/child_process.html#event-exit (read on 2022-11-27).

            // Get outputs
            if (null === child_process.stdout || null == child_process.stderr) {
                // The exception is caught locally below, but it's ok because it's then rethrown as the error message does not match '/spawn\s+ENAMETOOLONG/i'.
                throw new Error("Child process's stdout and/or stderr stream is null.");
            }
            const stdout: string = child_process.stdout.read() ?? "";
            let stderr: string = child_process.stderr.read() ?? ""; // let instead of const: stderr can be emptied later due to ignoring.

            // Did the shell command execute successfully?
            if (exitCode === null || exitCode > 0) {
                // Some error occurred
                debugLog("Command executed and failed. Error number: " + exitCode + ". Stderr: " + stderr);

                // Check if this error should be displayed to the user or not
                if (null !== exitCode && this.t_shell_command.getIgnoreErrorCodes().contains(exitCode)) {
                    // The user has ignored this error.
                    debugLog("User has ignored this error, so won't display it.");

                    // Handle only stdout output stream
                    stderr = "";
                    exitCode = null; // TODO: consider if exitCode should just be left untouched. It could be informative to 'Ask after execution' output channel that shows exit code to user.
                } else {
                    // The error can be shown.
                    debugLog("Will display the error to user.");
                }

                // Handle at least stdout (and maybe stderr) output stream
                handleBufferedOutput(this.plugin, this.t_shell_command, shell_command_parsing_result, stdout, stderr, exitCode, outputChannels);
            } else {
                // Probably no errors, but do one more check.

                // Even when 'error' is null and everything should be ok, there may still be error messages outputted in stderr.
                if (stderr.length > 0) {
                    // Check a special case: should error code 0 be ignored?
                    if (this.t_shell_command.getIgnoreErrorCodes().contains(0)) {
                        // Exit code 0 is on the ignore list, so suppress stderr output.
                        stderr = "";
                        debugLog("Shell command executed: Encountered error code 0, but stderr is ignored.");
                    } else {
                        debugLog("Shell command executed: Encountered error code 0, and stderr will be relayed to an output handler.");
                    }
                } else {
                    debugLog("Shell command executed: No errors.");
                }

                // Handle output
                handleBufferedOutput(this.plugin, this.t_shell_command, shell_command_parsing_result, stdout, stderr, 0, outputChannels); // Use zero as an error code instead of null (0 means no error). If stderr happens to contain something, exit code 0 gets displayed in an error balloon (if that is selected as a channel for stderr).
            }
        });
    }

    private handleRealtimeOutput(
            childProcess: ChildProcess,
            shell_command_parsing_result: ShellCommandParsingResult,
            outputChannelCodes: OutputChannelCodes,
            processTerminator: (() => void) | null,
        ) {

        // Prepare output channels
        const outputChannels = startRealtimeOutputHandling(
            this.plugin,
            this.t_shell_command,
            shell_command_parsing_result,
            outputChannelCodes,
            processTerminator,
        );

        // Define an output handler
        const handleNewOutputContent = async (outputStreamName: OutputStream, readableStream: Readable) => {
            if (null === childProcess.stdout || null == childProcess.stderr) {
                throw new Error("Child process's stdout and/or stderr stream is null.");
            }

            // Don't emit new events while the current handling is in progress. (I think) it might cause a race condition where a simultaneous handling could overwrite another handling's data. Pause both streams, not just the current one, to maintain correct handling order also between the two streams.
            childProcess.stdout.pause();
            childProcess.stderr.pause();

            const outputContent = readableStream.read() ?? "";
            const outputChannel: OutputChannel | undefined = outputChannels[outputStreamName];
            if (undefined === outputChannel) {
                throw new Error("Output channel is undefined.");
            }
            await outputChannel.handleRealtime(outputStreamName, outputContent);

            // Can emit new events again.
            childProcess.stdout.resume();
            childProcess.stderr.resume();
        };

        // Hook into output streams' (such as stdout and stderr) output retrieving events.
        // Note that there might be just one stream, e.g. only stderr, if stdout is ignored. In the future, there might also be more than two streams, when custom streams are implemented.
        for (const outputStreamName of Object.getOwnPropertyNames(outputChannels) as OutputStream[]) {
            const readableStream: Readable | null = childProcess[outputStreamName];
            if (null === readableStream) {
                throw new Error("Child process's readable stream '"+outputStreamName+"' is null.");
            }
            readableStream.on(
                "readable",
                () => handleNewOutputContent(outputStreamName, readableStream),
            );
        }

        // Hook into exit events
        childProcess.on("exit", (exitCode: number, signal: string /* TODO: Pass signal to channels so it can be shown to users in the future */) => {
            // Call all OutputChannels' endRealtime().
            const alreadyCalledChannelCodes: OutputChannelCode[] = [];
            for (const outputStreamName of Object.getOwnPropertyNames(outputChannels) as OutputStream[]) {
                const outputChannel: OutputChannel | undefined = outputChannels[outputStreamName];
                if (undefined === outputChannel) {
                    throw new Error("Output channel is undefined.");
                }
                const outputChannelCode: OutputChannelCode = outputChannelCodes[outputStreamName];

                // Ensure this OutputChannel has not yet been called.
                if (!alreadyCalledChannelCodes.includes(outputChannelCode)) {
                    // Not yet called, so do the call.
                    outputChannel.endRealtime(exitCode);

                    // Mark that this channel's endRealtime() has already been called. Solves a situation where stderr and stdout uses the same channel, in which case endRealtime() should not be accidentally called twice.
                    alreadyCalledChannelCodes.push(outputChannelCode);
                }
            }
        });
    }

    private getWorkingDirectory() {
        // Returns either a user defined working directory, or an automatically detected one.
        const working_directory = this.plugin.settings.working_directory;
        if (working_directory.length == 0) {
            // No working directory specified, so use the vault directory.
            return getVaultAbsolutePath(this.plugin.app);
        } else if (!path.isAbsolute(working_directory)) {
            // The working directory is relative.
            // Help to make it refer to the vault's directory. Without this, the relative path would refer to Obsidian's installation directory (at least on Windows).
            return path.join(getVaultAbsolutePath(this.plugin.app), working_directory);
        }
        return working_directory;
    }

    private augmentPATHEnvironmentVariable(path_augmentation: string, shell: Shell): string {
        path_augmentation = convertNewlinesToPATHSeparators(path_augmentation, shell);
        // Check if there's anything to augment.
        if (path_augmentation.length > 0) {
            // Augment.
            const original_path: string | undefined = process.env[getPATHEnvironmentVariableName()];
            if (undefined === original_path) {
                throw new Error("process.env does not contain '" + getPATHEnvironmentVariableName() + "'.");
            }
            let augmented_path: string;
            if (path_augmentation.contains(original_path)) {
                // The augmentation contains the original PATH.
                // Simply replace the whole original PATH with the augmented one, as there's no need to care about including
                // the original content.
                debugLog("Augmenting environment variable PATH so it will become " + path_augmentation);
                augmented_path = path_augmentation;
            } else {
                // The augmentation does not contain the original PATH.
                // Instead of simply replacing the original PATH, append the augmentation after it.
                const separator = shell.getPathSeparator();
                debugLog("Augmenting environment variable PATH by adding " + separator + path_augmentation + " after it.");
                augmented_path = original_path + separator + path_augmentation;
            }
            debugLog("PATH augmentation result: " + augmented_path);
            return augmented_path;
        } else {
            // No augmenting is needed.
            debugLog("No augmentation is defined for environment variable PATH. This is completely ok.");
            return "";
        }
    }

    /**
     * This method should only be called if it's first checked that neither shell command version for the current platform nor a 'default' version exists.
     *
     * @private
     */
    private getErrorMessageForEmptyShellCommand(): string {
        if (this.t_shell_command.getNonEmptyPlatformIds().length > 0) {
            // The shell command contains versions for other platforms, but not for the current one.
            const current_platform_name = PlatformNames[getOperatingSystem()];
            const version_word = this.t_shell_command.getNonEmptyPlatformIds().length > 1 ? "versions" : "a version";
            const other_platform_names = this.t_shell_command.getNonEmptyPlatformIds().map(platform_id => PlatformNames[platform_id]).join(" and ");
            return `The shell command does not have a version for ${current_platform_name}, it only has ${version_word} for ${other_platform_names}.`;
        } else {
            // The shell command doesn't contain a version for any platforms, it's completely empty.
            return "The shell command is empty. :(";
        }
    }

    /**
     * Displays a notification balloon indicating a user that a shell command is being executed.
     *
     * @param child_process
     * @param shell_command
     * @param execution_notification_mode
     * @param processTerminator Will be called if user clicks 'Request to terminate the process' icon.
     * @private
     */
    private showExecutionNotification(
        child_process: ChildProcess,
        shell_command: string,
        execution_notification_mode: ExecutionNotificationMode,
        processTerminator: () => void,
    ) {
        const createRequestTerminatingButton = (notice: Notice) => {
            // @ts-ignore Notice.noticeEl belongs to Obsidian's PRIVATE API, and it may change without a prior notice. Only
            // create the button if noticeEl exists and is an HTMLElement.
            const noticeEl = notice.noticeEl;
            if (undefined !== noticeEl && noticeEl instanceof HTMLElement) {
                this.plugin.createRequestTerminatingButton(noticeEl, processTerminator);
            }
        };

        const execution_notification_message = "Executing: " + (this.t_shell_command.getAlias() || shell_command);
        switch (execution_notification_mode) {
            case "quick": {
                // Retrieve the timeout from settings defined by a user.
                const processNotification = this.plugin.newNotification(execution_notification_message, undefined);
                createRequestTerminatingButton(processNotification);
                break;
            }
            case "permanent": {
                // Show the notification until the process ends.
                const processNotification = this.plugin.newNotification(execution_notification_message, 0);
                createRequestTerminatingButton(processNotification);

                // Hide the notification when the process finishes.
                child_process.on("exit", () => processNotification.hide());
                break;
            }
            case "if-long": {
                // Only show the notification if the process runs for an extended period of time (defined below).
                window.setTimeout(() => {
                    // Check if the process is still running.
                    if (null === child_process.exitCode && !child_process.killed) {
                        // The process is still running.
                        // Display notification.
                        const processNotification = this.plugin.newNotification(execution_notification_message, 0);
                        createRequestTerminatingButton(processNotification);

                        // Hide the notification when the process finishes.
                        child_process.on("exit", () => processNotification.hide());
                    }
                }, 2000); // If you change the timeout, change documentation, too!
                break;
            }
        }
    }
}