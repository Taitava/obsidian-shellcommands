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

import {exec, ExecException, ExecOptions} from "child_process";
import {
    cloneObject,
    getOperatingSystem,
    getVaultAbsolutePath,
} from "./Common";
import * as path from "path";
import * as fs from "fs";
import {handleShellCommandOutput} from "./output_channels/OutputChannelDriverFunctions";
import {BaseEncodingOptions} from "fs";
import {ShellCommandParsingProcess, ShellCommandParsingResult, TShellCommand} from "./TShellCommand";
import {isShellSupported} from "./Shell";
import {debugLog} from "./Debug";
import {SC_Event} from "./events/SC_Event";
import {
    ConfirmationModal,
    convertNewlinesToPATHSeparators,
    getPATHEnvironmentVariableName,
    getPATHSeparator,
    Preaction,
} from "./imports";
import SC_Plugin from "./main";

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
    public doPreactionsAndExecuteShellCommand(parsing_process?: ShellCommandParsingProcess) {
        const preactions = this.t_shell_command.getPreactions();

        // Does an already started ParsingProcess exist?
        if (!parsing_process) {
            // No ParsingProcess yet.
            // Create one and parse all variables that are safe to parse before preactions.
            debugLog("Going to prepare possible Preactions, but will first start a variable parsing process. Depending on possible Preactions, this might not yet parse all variables.");
            parsing_process = this.t_shell_command.createParsingProcess(this.sc_event);
            // Parse the first set of variables, not all sets.
            if (!parsing_process.process()) {
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
                return preaction.perform(parsing_process, this.sc_event);
            });
        });
        if (0 === preactions.length) {
            debugLog("No Preactions to perform. This is ok.");
        }

        preaction_pipeline.then((can_execute: boolean) => {
            if (can_execute) {
                // Parse either all variables, or if some variables are already parsed, then just the rest. Might also be that
                // all variables are already parsed.
                debugLog("Parsing all the rest of the variables (if there are any left).");
                if (parsing_process.processRest()) {
                    // Parsing the rest of the variables succeeded
                    // Execute the shell command.
                    const parsing_results = parsing_process.getParsingResults();
                    const shell_command_parsing_result: ShellCommandParsingResult = {
                        shell_command: parsing_results["shell_command"].parsed_content,
                        alias: parsing_results["alias"].parsed_content,
                        environment_variable_path_augmentation: parsing_results.environment_variable_path_augmentation.parsed_content,
                        succeeded: true,
                        error_messages: [],
                    };
                    debugLog("Will call ShellCommandExecutor.executeShellCommand().");
                    this.executeShellCommand(shell_command_parsing_result);
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
     */
    private executeShellCommand(shell_command_parsing_result: ShellCommandParsingResult) {
        const working_directory = this.getWorkingDirectory();

        // Check that the shell command is not empty
        const shell_command = shell_command_parsing_result.shell_command.trim();
        if (!shell_command.length) {
            // It is empty
            debugLog("The shell command is empty. :(");
            this.plugin.newError("The shell command is empty :(");
            return;
        }

        // Check that the currently defined shell is supported by this plugin. If using system default shell, it's possible
        // that the shell is something that is not supported. Also, the settings file can be edited manually, and incorrect
        // shell can be written there.
        const shell = this.t_shell_command.getShell();
        if (!isShellSupported(shell)) {
            debugLog("Shell is not supported: " + shell);
            this.plugin.newError("This plugin does not support the following shell: " + shell);
            return;
        }

        // Define an object for environment variables.
        const environment_variables = cloneObject(process.env); // Need to clone process.env, otherwise the modifications below will be stored permanently until Obsidian is hard-restarted (= closed and launched again).

        // Augment the PATH environment variable (if wanted)
        const augmented_path = this.augmentPATHEnvironmentVariable(shell_command_parsing_result.environment_variable_path_augmentation);
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
            const options: BaseEncodingOptions & ExecOptions = {
                "cwd": working_directory,
                "shell": shell,
                "env": environment_variables,
            };

            // Execute the shell command
            debugLog("Executing command " + shell_command + " in " + working_directory + "...");
            exec(shell_command, options, (error: ExecException|null, stdout: string, stderr: string) => {

                // Did the shell command execute successfully?
                if (null !== error) {
                    // Some error occurred
                    debugLog("Command executed and failed. Error number: " + error.code + ". Message: " + error.message);

                    // Check if this error should be displayed to the user or not
                    if (this.t_shell_command.getIgnoreErrorCodes().contains(error.code)) {
                        // The user has ignored this error.
                        debugLog("User has ignored this error, so won't display it.");

                        // Handle only stdout output stream
                        handleShellCommandOutput(this.plugin, this.t_shell_command, shell_command_parsing_result, stdout, "", null);
                    } else {
                        // Show the error.
                        debugLog("Will display the error to user.");

                        // Check that stderr actually contains an error message
                        if (!stderr.length) {
                            // Stderr is empty, so the error message is probably given by Node.js's child_process.
                            // Direct error.message to the stderr variable, so that the user can see error.message when stderr is unavailable.
                            stderr = error.message;
                        }

                        // Handle both stdout and stderr output streams
                        handleShellCommandOutput(this.plugin, this.t_shell_command, shell_command_parsing_result, stdout, stderr, error.code);
                    }
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
                    handleShellCommandOutput(this.plugin, this.t_shell_command, shell_command_parsing_result, stdout, stderr, 0); // Use zero as an error code instead of null (0 means no error). If stderr happens to contain something, exit code 0 gets displayed in an error balloon (if that is selected as a driver for stderr).
                }
            });
        }
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

    private augmentPATHEnvironmentVariable(path_augmentation: string): string {
        path_augmentation = convertNewlinesToPATHSeparators(path_augmentation, getOperatingSystem());
        // Check if there's anything to augment.
        if (path_augmentation.length > 0) {
            // Augment.
            const original_path = process.env[getPATHEnvironmentVariableName()];
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
                const separator = getPATHSeparator(getOperatingSystem());
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
}