import {ShellCommandVariable} from "./ShellCommandVariable";
import ShellCommandsPlugin from "../main";
import {debugLog} from "../Debug";
import {getVariables} from "./VariableLists";

/**
 * @param plugin
 * @param command
 * @return string|string[] If parsing fails, an array of string error messages is returned. If the parsing succeeds, the parsed shell command will be returned just as a string, not in an array.
 */
export function parseShellCommandVariables(plugin: ShellCommandsPlugin, command: string, shell: string): string | string[] {
    const variables = getVariables(plugin, shell);
    let parsed_command = command; // Create a copy of the variable because we don't want to alter the original value of 'command' during iterating its regex matches.
    for (let variable_index in variables)
    {
        let variable: ShellCommandVariable = variables[variable_index];
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

            // Should the variable's value be escaped? (Usually yes).
            let escape = true;
            if ("{{!" === substitute.slice(0, 3)) { // .slice(0, 3) = get characters 0...2, so stop before 3. The 'end' parameter is confusing.
                // The variable usage begins with {{! instead of {{
                // This means the variable's value should NOT be escaped.
                escape = false;
            }

            // Render the variable
            let variable_value = variable.getValue(escape);
            if (variable.getErrorMessages().length) {
                // There has been a problem and executing the command should be cancelled.
                debugLog("Parsing command " + command + " failed.");
                return variable.getErrorMessages(); // Returning now prevents parsing rest of the variables.
            }
            else
            {
                parsed_command = parsed_command.replace(substitute, () => {
                    // Do the replacing in a function in order to avoid a possible $ character to be interpreted by JavaScript to interact with the regex.
                    // More information: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter (referenced 2021-11-02.)
                    return variable_value;
                });
            }
        }
    }
    return parsed_command;
}
