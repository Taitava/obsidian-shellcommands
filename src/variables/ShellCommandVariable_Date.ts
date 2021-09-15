import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {moment} from "obsidian";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Date extends ShellCommandVariable {
    name = "date";
    has_argument = true;

    getValue(format: string): string {
        return moment().format(format);
    }
}
addShellCommandVariableInstructions(
    "{{date:format}}",
    "Gives a date/time stamp as per your liking. The \"format\" part can be customized and is mandatory. Formatting options: https://momentjs.com/docs/#/displaying/format/",
);