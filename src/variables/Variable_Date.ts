import {moment} from "obsidian";
import {IParameters, Variable} from "./Variable";

export class Variable_Date extends Variable {
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