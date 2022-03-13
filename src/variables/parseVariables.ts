import SC_Plugin from "../main";
import {debugLog} from "../Debug";
import {SC_Event} from "../events/SC_Event";
import {escapeValue} from "./escapers/EscapeValue";

let parsed_variables_count: number;

/**
 * @param plugin
 * @param content
 * @param shell Used to determine how to escape special characters in variable values. Can be null, if no escaping is wanted.
 * @param sc_event Use undefined, if parsing is not happening during an event.
 * @return ParsingResult
 */
export function parseVariables(plugin: SC_Plugin, content: string, shell: string | null, sc_event?: SC_Event | null): ParsingResult {
    const parsing_result: ParsingResult = {
        parsed_content: null,
        succeeded: false,
        error_messages: [],
    };

    const variables = plugin.getVariables();
    parsing_result.parsed_content = content; // Create a copy of the variable because we don't want to alter the original value of 'content' during iterating its regex matches. Originally this copy was just another local variable, but now it's changed to be a property in an object.
    parsed_variables_count = 0;
    for (const variable of variables)
    {
        const pattern = new RegExp(variable.getPattern(), "igu"); // i: case-insensitive; g: match all occurrences instead of just the first one. u: support 4-byte unicode characters too.
        const parameter_names = variable.getParameterNames();
        let argument_matches: RegExpExecArray; // Need to prefix with _ because JavaScript reserves the variable name 'arguments'.
        while ((argument_matches = pattern.exec(content)) !== null) {
            // Make sure the variable does not contain old arguments or old error messages. Needed because variable instances are reused between parsing calls.
            variable.reset();

            // Count how many times any variables have appeared.
            parsed_variables_count++;

            // Remove stuff that should not be iterated in a later loop.
            const _arguments = argument_matches.filter((value: any/* Won't be used */, key: any) => {
                return "number" === typeof key;
                // This leaves out for example the following non-numeric keys (and their values):
                // - "groups"
                // - "index"
                // - "input"
                // In the future, there can also come more elements that will be skipped. E.g. "indices". See: https://github.com/nothingislost/obsidian-dynamic-highlights/issues/25#issuecomment-1038563990 (referenced 2022-02-22).
            });

            // Get the {{variable}} string that will be substituted (= replaced with the actual value of the variable).
            const substitute = _arguments.shift(); // '_arguments[0]' contains the whole match, not just an argument. Get it and remove it from '_arguments'.

            // Iterate all arguments
            for (const i in _arguments) {
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
            if (!shell) {
                // Escaping is forced OFF.
                escape = false;
            }

            // Render the variable
            const raw_variable_value = variable.getValue(sc_event);
            if (variable.getErrorMessages().length) {
                // There has been problem(s) with this variable.
                debugLog("Parsing content " + content + " failed.");
                parsing_result.succeeded = false;
                parsing_result.parsed_content = null;
                parsing_result.error_messages = variable.getErrorMessages(); // Returning now prevents parsing rest of the variables.
                return parsing_result;
            }
            else
            {
                // Parsing was ok.

                // Escape the value if needed.
                let use_variable_value: string;
                if (escape) {
                    // Use an escaped value.
                    use_variable_value = escapeValue(shell, raw_variable_value);
                } else {
                    // No escaping is wanted, so use the raw value.
                    use_variable_value = raw_variable_value;
                }

                // Replace the variable name with the variable value.
                parsing_result.parsed_content = parsing_result.parsed_content.replace(substitute, () => {
                    // Do the replacing in a function in order to avoid a possible $ character to be interpreted by JavaScript to interact with the regex.
                    // More information: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter (referenced 2021-11-02.)
                    return use_variable_value;
                });
            }
        }
    }
    parsing_result.succeeded = true;
    return parsing_result;
}

/**
 * TODO: Make parseVariables() to return a ParsingResult and insert the variable count in that interface. Then remove the global variable parsed_variables_count.
 */
export function countOfParsedVariables(): number {
    return parsed_variables_count;
}

export interface ParsingResult {
    parsed_content: string;
    succeeded: boolean;
    error_messages: string[];
}