import {ShellCommandVariable} from "./ShellCommandVariable";
import ShellCommandsPlugin from "../main";
import {ShellCommandVariable_FolderName} from "./ShellCommandVariable_FolderName";
import {ShellCommandVariable_Selection} from "./ShellCommandVariable_Selection";
import {ShellCommandVariable_FilePath} from "./ShellCommandVariable_FilePath";
import {ShellCommandVariable_Clipboard} from "./ShellCommandVariable_Clipboard";
import {ShellCommandVariable_Date} from "./ShellCommandVariable_Date";
import {ShellCommandVariable_VaultPath} from "./ShellCommandVariable_VaultPath";
import {ShellCommandVariable_FileName} from "./ShellCommandVariable_FileName";
import {ShellCommandVariable_FolderPath} from "./ShellCommandVariable_FolderPath";
import {ShellCommandVariable_Newline} from "./ShellCommandVariable_Newline";
import {ShellCommandVariable_Tags} from "./ShellCommandVariable_Tags";
import {ShellCommandVariable_Title} from "./ShellCommandVariable_Title";
import {ShellCommandVariable_Workspace} from "./ShellCommandVariable_Workspace";

/**
 * @param plugin
 * @param command
 * @return string|string[] If parsing fails, an array of string error messages is returned. If the parsing succeeds, the parsed shell command will be returned just as a string, not in an array.
 */
export function parseShellCommandVariables(plugin: ShellCommandsPlugin, command: string): string | string[] {
    let shell_variables: ShellCommandVariable[] = [
        new ShellCommandVariable_Clipboard(plugin),
        new ShellCommandVariable_Date(plugin),
        new ShellCommandVariable_FileName(plugin),
        new ShellCommandVariable_FilePath(plugin),
        new ShellCommandVariable_FolderName(plugin),
        new ShellCommandVariable_FolderPath(plugin),
        new ShellCommandVariable_Newline(plugin),
        new ShellCommandVariable_Selection(plugin),
        new ShellCommandVariable_Tags(plugin),
        new ShellCommandVariable_Title(plugin),
        new ShellCommandVariable_VaultPath(plugin),
        new ShellCommandVariable_Workspace(plugin),
    ];
    let parsed_command = command; // Create a copy of the variable because we don't want to alter the original value of 'command' during iterating its regex matches.
    for (let variable_index in shell_variables)
    {
        let variable: ShellCommandVariable = shell_variables[variable_index];
        let pattern = new RegExp(variable.getPattern(), "ig"); // i: case-insensitive; g: match all occurrences instead of just the first one.
        const parameter_names = variable.getParameterNames();
        let _arguments: RegExpExecArray; // Need to prefix with _ because JavaScript reserves the variable name 'arguments'.
        while ((_arguments = pattern.exec(command)) !== null) {
            const substitute = _arguments.shift(); // '_arguments[0]' contains the whole match, not just an argument. Get it and remove it from '_arguments'.

            // Remove stuff that should not be iterated in the next loop.
            // "If the property which you are trying to delete does not exist, delete will not have any effect and will return true." This is good. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete
            delete _arguments["groups"];
            delete _arguments["index"];
            delete _arguments["input"];

            // Iterate all arguments
            for (let i in _arguments) {
                // Check that the argument is not omitted. It can be omitted (= undefined), if the parameter is optional.
                if (undefined !== _arguments[i]) {
                    // The argument is present.
                    const argument = _arguments[i].slice(1); // .slice(1): Remove a preceding :
                    const parameter_name = parameter_names[i];
                    variable.setArgument(parameter_name, argument);
                }
            }

            // Render the variable
            let variable_value = variable.getValue();
            if (variable.getErrorMessages().length) {
                // There has been a problem and executing the command should be cancelled.
                console.log("Parsing command " + command + " failed.");
                return variable.getErrorMessages(); // Returning now prevents parsing rest of the variables.
            }
            else
            {
                parsed_command = parsed_command.replace(substitute, variable_value);
            }
        }
    }
    return parsed_command;
}
