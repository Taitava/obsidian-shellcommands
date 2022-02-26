import {Variable} from "./Variable";
// @ts-ignore "electron" is installed.
import {clipboard} from "electron";

export class Variable_Clipboard extends Variable {
    public static variable_name = "clipboard";
    public static help_text = "Gives the content you last copied to your clipboard.";

    protected generateValue(): string {
        return clipboard.readText();
    }
}