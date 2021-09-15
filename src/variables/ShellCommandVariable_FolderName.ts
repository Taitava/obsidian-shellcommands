import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FolderName extends ShellCommandVariable{
    name = "folder_name";
    getValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        if (!file.parent) {
            this.newError("The current file does not have a parent for some strange reason.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.parent.name;
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{folder_name}}",
    instructions: "Gives the current file's parent folder name. No ancestor folders are included.",
});