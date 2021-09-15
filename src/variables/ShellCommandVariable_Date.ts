import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {moment} from "obsidian";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Date extends ShellCommandVariable {
    name = "date";
    has_argument = true;

    getValue(format: string): string {
        return moment().format(format);
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{date:format}}",
    instructions: "Gives a date/time stamp as per your liking. The \"format\" part can be customized and is mandatory. Formatting options: https://momentjs.com/docs/#/displaying/format/",
});