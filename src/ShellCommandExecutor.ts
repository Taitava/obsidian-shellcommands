import {exec, ExecException, ExecOptions} from "child_process";
import {
    getVaultAbsolutePath,
} from "./Common";
import * as path from "path";
import * as fs from "fs";
import {ConfirmExecutionModal} from "./ConfirmExecutionModal";
import {handleShellCommandOutput} from "./output_channels/OutputChannelDriverFunctions";
import {BaseEncodingOptions} from "fs";
import {ShellCommandParsingResult, TShellCommand} from "./TShellCommand";
import {isShellSupported} from "./Shell";
import {debugLog} from "./Debug";
import {SC_Event} from "./events/SC_Event";
import {
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
     *
     * TODO: Change the name of this method to reflect the new behavior.
     *
     * @param shell_command_parsing_result The actual shell command that will be executed.
     */
    public confirmAndExecuteShellCommand(shell_command_parsing_result: ShellCommandParsingResult) {

        // Perform preactions before execution
        const preactions = this.t_shell_command.getPreactions(this.sc_event);
        let preaction_pipeline = Promise.resolve(); // Will contain a series of preaction performs.
        preactions.forEach((preaction: Preaction) => {
            preaction_pipeline = preaction_pipeline.then(() => {
                return preaction.perform();
            });
        });
        preaction_pipeline.then(() => {
            // Execute

            // TODO: This confirmation check should be migrated into a Preaction. We should go now directly to the execution part.
            // Check if the command needs confirmation before execution
            if (this.t_shell_command.getConfirmExecution()) {
                // Yes, a confirmation is needed.
                // Open a confirmation modal.
                new ConfirmExecutionModal(this.plugin, shell_command_parsing_result, this.t_shell_command)
                    .open()
                ;
                return; // Do not execute now. The modal will call executeShellCommand() later if needed.
                // TODO: This confirmation check should be migrated into a Preaction.
            } else {
                // No need to confirm.
                // Execute.
                this.executeShellCommand(shell_command_parsing_result);
            }
        }).catch(() => {
            // Cancel execution
            debugLog("Shell command execution cancelled.")
        });


    }

    /**
     * Does not ask for confirmation before execution. This should only be called if: a) a confirmation is already asked from a user, or b) this command is defined not to need a confirmation.
     * Use confirmAndExecuteShellCommand() instead to have a confirmation asked before the execution.
     *
     * @param shell_command_parsing_result The actual shell command that will be executed is taken from this object's '.shell_command' property.
     */
    public executeShellCommand(shell_command_parsing_result: ShellCommandParsingResult) {
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

}