import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Title extends ShellCommandVariable{
    name = "title";
    getValue(): string {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            return active_file.basename;
        }
        this.newError("No file is active at the moment. Open a file or click a pane that has a file open.")
        return null;
    }
}
addShellCommandVariableInstructions(
    "{{title}}",
    "Gives the current file name without a file extension.",
);