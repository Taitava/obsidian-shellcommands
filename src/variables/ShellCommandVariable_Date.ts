import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {moment} from "obsidian";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Date extends ShellCommandVariable {
    static variable_name = "date";
    static help_text = "Gives a date/time stamp as per your liking. The \"format\" part can be customized and is mandatory. Formatting options: https://momentjs.com/docs/#/displaying/format/";

    protected static readonly parameters: IParameters = {
        format: {
            type: "string",
            required: true,
        },
    }

    protected arguments: {
        format: string,
    }

    generateValue(): string {
        return moment().format(this.arguments.format);
    }
}
addShellCommandVariableInstructions(
    "{{date:format}}",
    ShellCommandVariable_Date.help_text,
);