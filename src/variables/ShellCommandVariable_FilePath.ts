import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {getVaultAbsolutePath} from "../../Common";
import {normalizePath} from "obsidian";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FilePath extends ShellCommandVariable{
    name = "file_path";
    has_argument = true;
    getValue(mode: string): string|null {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            switch (mode) {
                case "absolute":
                    return normalizePath(getVaultAbsolutePath(this.app) + "/" + active_file.path);
                case "relative":
                    return active_file.path;
                default:
                    this.newError(`Unknown mode "${mode}"! Use "absolute" or "relative".`);
                    return null; // null indicates that getting a value has failed and the command should not be executed.
            }
        } else {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{file_path:relative}} or {{file_path:absolute}}",
    instructions: "Gives path to the current file, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.",
});