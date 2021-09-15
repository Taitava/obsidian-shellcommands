import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
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
shell_command_variable_instructions.push({
    variable_name: "{{title}}",
    instructions: "Gives the current file name without a file extension.",
});