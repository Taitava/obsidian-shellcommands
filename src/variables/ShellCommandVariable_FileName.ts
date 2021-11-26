import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FileName extends ShellCommandVariable{
    static variable_name = "file_name";
    generateValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.name;
    }
}
addShellCommandVariableInstructions(
    "{{file_name}}",
    "Gives the current file name with a file extension. If you need it without the extension, use {{title}} instead.",
);