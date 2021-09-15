import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FileName extends ShellCommandVariable{
    name = "file_name";
    getValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.name;
    }
}
addShellCommandVariableInstructions(
    "{{file_name}}",
    "Gives the current file name with a file extension.",
);