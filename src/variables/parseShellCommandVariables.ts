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

export function parseShellCommandVariables(plugin: ShellCommandsPlugin, command: string, enable_error_messages: boolean) {
    let shell_variables: ShellCommandVariable[] = [
        new ShellCommandVariable_Clipboard(plugin, enable_error_messages),
        new ShellCommandVariable_Date(plugin, enable_error_messages),
        new ShellCommandVariable_FileName(plugin, enable_error_messages),
        new ShellCommandVariable_FilePath(plugin, enable_error_messages),
        new ShellCommandVariable_FolderName(plugin, enable_error_messages),
        new ShellCommandVariable_FolderPath(plugin, enable_error_messages),
        new ShellCommandVariable_Selection(plugin, enable_error_messages),
        new ShellCommandVariable_Title(plugin, enable_error_messages),
        new ShellCommandVariable_VaultPath(plugin, enable_error_messages),
    ];
    let parsed_command = command; // Create a copy of the variable because we don't want to alter the original value of 'command' during iterating its regex matches.
    let parsing_failed = false;
    shell_variables.forEach((variable: ShellCommandVariable) => {
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
            if (null === variable_value) {
                // The variable value getter has indicated that there has been a problem (probably in the passed argument) and executing the command should be cancelled. No need to continue iterating other variables.
                parsing_failed = true;
                // TODO: Find out how to break from forEach() so that we don't need to unnecessarily iterate the rest of the variables.
            }
            else
            {
                parsed_command = parsed_command.replace(substitute, variable_value);
            }
        }
    });
    if (parsing_failed) {
        return null;
    }
    return parsed_command;
}
