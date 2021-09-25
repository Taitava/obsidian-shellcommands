import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FolderName extends ShellCommandVariable{
    name = "folder_name";
    getValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        if (!file.parent) {
            this.newErrorMessage("The current file does not have a parent for some strange reason.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.parent.name;
    }
}
addShellCommandVariableInstructions(
    "{{folder_name}}",
    "Gives the current file's parent folder name. No ancestor folders are included.",
);