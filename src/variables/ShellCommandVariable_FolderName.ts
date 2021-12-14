import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandFolderVariable} from "./ShellCommandFolderVariable";

export class ShellCommandVariable_FolderName extends ShellCommandFolderVariable {
    static variable_name = "folder_name";
    static help_text = "Gives the current file's parent folder name. No ancestor folders are included.";

    generateValue(): string {
        const folder = this.getFolder();
        if (!folder) {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return folder.name;
    }
}
addShellCommandVariableInstructions(
    "{{folder_name}}",
    ShellCommandVariable_FolderName.help_text,
);