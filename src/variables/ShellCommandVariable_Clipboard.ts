import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Clipboard extends ShellCommandVariable {
    name = "clipboard";

    getValue(): string {
        let clipboard = require("electron").clipboard;
        return clipboard.readText();
    }
}
addShellCommandVariableInstructions(
    "{{clipboard}}",
    "Gives the content you last copied to your clipboard.",
);