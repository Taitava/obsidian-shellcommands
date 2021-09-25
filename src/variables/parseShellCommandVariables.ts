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
        new ShellCommandVariable_Selection(plugin),
        new ShellCommandVariable_Title(plugin),
        new ShellCommandVariable_VaultPath(plugin),
        new ShellCommandVariable_Workspace(plugin),
    ];
    let parsed_command = command; // Create a copy of the variable because we don't want to alter the original value of 'command' during iterating its regex matches.
    for (let variable_index in shell_variables)
    {
        let variable: ShellCommandVariable = shell_variables[variable_index];
        let pattern = new RegExp(variable.getPattern(), "ig"); // i: case-insensitive; g: match all occurrences instead of just the first one.
        let match;
        while ((match = pattern.exec(command)) !== null) {
            let substitute = match[0];
            let argument = null;
            if (variable.has_argument && undefined !== match[1]) {
                // Extract an argument from the match.
                argument = match[1];
            }
            let variable_value = variable.getValue(argument);
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
