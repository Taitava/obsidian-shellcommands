import {Variable} from "./Variable";
// @ts-ignore "electron" is installed.
import {clipboard} from "electron";

export class Variable_Clipboard extends Variable {
    static variable_name = "clipboard";
    static help_text = "Gives the content you last copied to your clipboard.";

    generateValue(): string {
        return clipboard.readText();
    }
}