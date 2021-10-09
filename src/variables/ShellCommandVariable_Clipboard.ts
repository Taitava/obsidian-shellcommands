import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";
// @ts-ignore "electron" is installed.
import {clipboard} from "electron";

export class ShellCommandVariable_Clipboard extends ShellCommandVariable {
    name = "clipboard";

    getValue(): string {
        return clipboard.readText();
    }
}
addShellCommandVariableInstructions(
    "{{clipboard}}",
    "Gives the content you last copied to your clipboard.",
);