import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Clipboard extends ShellCommandVariable {
    name = "clipboard";

    getValue(): string {
        let clipboard = require("electron").clipboard;
        return clipboard.readText();
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{clipboard}}",
    instructions: "Gives the content you last copied to your clipboard.",
});