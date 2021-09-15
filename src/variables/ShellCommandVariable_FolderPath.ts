import {normalizePath} from "obsidian";
import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {getVaultAbsolutePath} from "../../Common";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FolderPath extends ShellCommandVariable{
    name = "folder_path";
    has_argument = true;
    getValue(mode: string): string|null {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            if (active_file.parent) {
                let folder = active_file.parent;
                switch (mode) {
                    case "absolute":
                        return normalizePath(getVaultAbsolutePath(this.app) + "/" + folder.path);
                    case "relative":
                        return folder.path;
                    default:
                        this.newError(`Unknown mode "${mode}"! Use "absolute" or "relative".`);
                        return null; // null indicates that getting a value has failed and the command should not be executed.
                }
            } else {
                this.newError("The current file does not have a parent for some strange reason.");
                return null; // null indicates that getting a value has failed and the command should not be executed.
            }
        } else {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{folder_path:relative}} or {{folder_path:absolute}}",
    instructions: "Gives path to the current file's parent folder, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.",
});