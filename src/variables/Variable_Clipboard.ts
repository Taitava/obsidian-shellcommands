// @ts-ignore "electron" is installed.
import {clipboard} from "electron";
import {
    Variable,
} from "src/imports";

export class Variable_Clipboard extends Variable {
    public variable_name = "clipboard";
    public help_text = "Gives the content you last copied to your clipboard.";

    protected generateValue(): string {
        return clipboard.readText();
    }
}