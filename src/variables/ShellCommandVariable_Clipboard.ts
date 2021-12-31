import {ShellCommandVariable} from "./ShellCommandVariable";
// @ts-ignore "electron" is installed.
import {clipboard} from "electron";

export class ShellCommandVariable_Clipboard extends ShellCommandVariable {
    static variable_name = "clipboard";
    static help_text = "Gives the content you last copied to your clipboard.";

    generateValue(): string {
        return clipboard.readText();
    }
}