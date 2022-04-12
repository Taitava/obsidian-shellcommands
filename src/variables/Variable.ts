/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {App} from "obsidian";
import SC_Plugin from "../main";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {SC_Event} from "../events/SC_Event";
import {escapeRegExp} from "../lib/escapeRegExp";
import {TShellCommand} from "../TShellCommand";
import {debugLog} from "../Debug";
import {ParsingResult} from "./parseVariables";

/**
 * Variables that can be used to inject values to shell commands using {{variable:argument}} syntax.
 */
export abstract class Variable {
    private static readonly parameter_separator = ":";
    protected readonly app: App;
    private error_messages: string[]; // Default value is set in .reset()
    public variable_name: string;
    public help_text: string;

    /**
     * If this is false, the variable can be assigned a default value that can be used in situations where the variable is unavailable.
     * @protected
     */
    protected always_available = true;

    /**
     * A definition for what parameters this variables takes.
     * @protected
     */
    protected static readonly parameters: IParameters = {};

    /**
     * This contains actual values for parameters.
     * @protected
     */
    protected arguments: IArguments; // Default value is set in .reset()

    constructor(
        protected readonly plugin: SC_Plugin,
    ) {
        this.app = plugin.app;
        this.reset(); // This is also called in parseShellCommandVariables(), but call it here just in case.
    }

    /**
     * Variable instances are reused multiple times. This method resets all properties that are modified during usage:
     *  - error_messages
     *  - arguments
     */
    public reset() {
        this.error_messages = [];
        this.arguments = {};
    }

    public getValue(
        t_shell_command: TShellCommand | null = null,
        sc_event: SC_Event | null = null,

        /**
         * Will parse variables in a default value (only used if this variable is not available this time). The callback
         * is only used, if t_shell_command is given. Set to null, if no variable parsing is needed for default values.
         * */
        default_value_parser: ((content: string) => ParsingResult) | null = null,
    ): VariableValueResult {
        let value: string;
        if (this.isAvailable(sc_event)) {
            // The variable can be used.
            value = this.generateValue(sc_event);
            return {
                value: value,
                error_messages: this.error_messages,
                succeeded: this.error_messages.length === 0,
            };
        } else {
            // The variable is not available in this situation.
            // Check what should be done.
            const default_value_configuration = t_shell_command?.getDefaultValueConfigurationForVariable(this); // The method can return undefined, and t_shell_command can be null.
            const default_value_type = default_value_configuration ? default_value_configuration.type : "show-errors";
            const debug_message_base = "Variable " + this.getFullName() + " is not available. ";
            switch (default_value_type) {
                case "show-errors":
                    // Generate error messages by calling generateValue().
                    debugLog(debug_message_base + "Will prevent shell command execution and show visible error messages.");
                    this.generateValue(); // No need to use the return value, it's null anyway.
                    return {
                        value: null,
                        error_messages: this.error_messages,
                        succeeded: false,
                    };
                case "cancel-silently":
                    // Prevent execution, but do not show any errors
                    debugLog(debug_message_base + "Will prevent shell command execution silently without visible error messages.");
                    return {
                        value: null,
                        error_messages: [],
                        succeeded: false,
                    };
                case "value":
                    // Return a default value.
                    debugLog(debug_message_base + "Will use a default value: " + default_value_configuration.value);
                    if (default_value_parser) {
                        // Parse possible variables in the default value.
                        const default_value_parsing_result = default_value_parser(default_value_configuration.value);
                        return {
                            value:
                                default_value_parsing_result.succeeded
                                    ? default_value_parsing_result.parsed_content
                                    : default_value_parsing_result.original_content
                            ,
                            error_messages: default_value_parsing_result.error_messages,
                            succeeded: default_value_parsing_result.succeeded,
                        };
                    } else {
                        // No variable parsing is wanted.
                        return {
                            value: default_value_configuration.value,
                            error_messages: [],
                            succeeded: true,
                        };
                    }
            }
        }
    }

    /**
     * TODO: Consider can the sc_event parameter be moved so that it would only exist in EventVariable and it's child classes? Same for getValue() method, but that method might be removed some day.
     */
    protected abstract generateValue(sc_event?: SC_Event): string|null;

    protected getParameters() {
        const child_class = this.constructor as typeof Variable;
        return child_class.parameters;
    }

    private getParameterSeparator() {
        const child_class = this.constructor as typeof Variable;
        return child_class.parameter_separator;
    }

    public getPattern() {
        const error_prefix = this.variable_name + ".getPattern(): ";
        let pattern = '\\{\\{!?' + escapeRegExp(this.variable_name);
        for (const parameter_name in this.getParameters()) {
            const parameter = this.getParameters()[parameter_name];
            let parameter_type_pattern: string = this.getParameterSeparator();  // Here this.parameter_separator (= : ) is included in the parameter value just so that it's not needed to do nested parenthesis to accomplish possible optionality: (:())?. parseShellCommandVariables() will remove the leading : .

            // Check should we use parameter.options or parameter.type.
            if (
                undefined === parameter.options &&
                undefined === parameter.type
            ) {
                // Neither is defined :(
                throw Error(error_prefix + "Parameter '" + parameter_name + "' should define either 'type' or 'options', neither is defined!");
            } else if (
                undefined !== parameter.options &&
                undefined !== parameter.type
            ) {
                // Both are defined :(
                throw Error(error_prefix + "Parameter '" + parameter_name + "' should define either 'type' or 'options', not both!");
            } else if (undefined !== parameter.options) {
                // Use parameter.options
                parameter_type_pattern += parameter.options.join("|" + this.getParameterSeparator()); // E.g. "absolute|:relative" for {{file_path:mode}} variable's 'mode' parameter.
            } else {
                // Use parameter.type
                switch (parameter.type) {
                    case "string":
                        parameter_type_pattern += ".*?";
                        break;
                    case "integer":
                        parameter_type_pattern += "\\d+";
                        break;
                    default:
                        throw Error(error_prefix + "Parameter '" + parameter_name + "' has an unrecognised type: " + parameter.type);
                }
            }

            // Add the subpattern to 'pattern'.
            pattern += "(" + parameter_type_pattern + ")";
            if (!parameter.required) {
                // Make the parameter optional.
                pattern += "?";
            }

        }
        pattern += '\\}\\}';
        return pattern;
    }

    public getParameterNames() {
        return Object.getOwnPropertyNames(this.getParameters());
    }

    /**
     * @param parameter_name
     * @param argument At this point 'argument' is always a string, but this method may convert it to another data type, depending on the parameter's data type.
     */
    public setArgument(parameter_name: string, argument: string) {
        const parameter_type = this.getParameters()[parameter_name].type ?? "string"; // If the variable uses "options" instead of "type", then the type is always "string".
        switch (parameter_type) {
            case "string":
                this.arguments[parameter_name] = argument;
                break;
            case "integer":
                this.arguments[parameter_name] = parseInt(argument);
                break;
        }
    }

    protected newErrorMessage(message: string) {
        const prefix = "{{" + this.variable_name + "}}: ";
        this.error_messages.push(prefix + message);
        debugLog(prefix + message);
    }

    protected newErrorMessages(messages: string[]) {
        messages.forEach((message: string) => {
            this.newErrorMessage(message);
        });
    }

    public getAutocompleteItems(): IAutocompleteItem[] {

        // Check if the variable has at least one _mandatory_ parameter.
        let parameters = ""
        let parameter_indicator = "";
        const parameter_names =
            Object.getOwnPropertyNames(this.getParameters())
                .filter(parameter_name => this.getParameters()[parameter_name].required === true) // Only include mandatory parameters
        ;
        if (parameter_names.length > 0) {
            parameter_indicator = Variable.parameter_separator; // When the variable name ends with a parameter separator character, it indicates to a user that an argument should be supplied.
        }

        return [
            // Normal variable
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + parameter_indicator + "}}",
                help_text: (this.help_text + " " + this.getAvailabilityText()).trim(), // .trim() removes " " if help_text or getAvailabilityText() is empty.
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped version of the variable
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + parameter_indicator + "}}",
                help_text: (this.help_text + " " + this.getAvailabilityText()).trim(), // .trim() removes " " if help_text or getAvailabilityText() is empty.
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName() {
        return "<strong>" + this.getFullName() + "</strong>";
    }

    /**
     * Returns the Variable's name wrapped in {{ and }}.
     *
     * TODO: Change hardcoded {{ }} entries to use this method all around the code.
     */
    public getFullName(): string {
        return "{{" + this.variable_name + "}}";
    }

    /**
     * Returns a unique string that can be used in default value configurations.
     * @return Normal variable name, if this is a built-in variable; or an ID string if this is a CustomVariable.
     */
    public getIdentifier(): string {
        return this.getFullName();
    }

    /**
     * Tells whether the variable can be currently accessed. If you want to know if the variable can sometimes be inaccessible,
     * use isAlwaysAvailable() instead.
     */
    public isAvailable(sc_event: SC_Event | null) {
        return true; // If the variable is always available, return true. If not, the variable should override this method.
    }

    /**
     * This can be used to determine if the variable can sometimes be unavailable. Used in settings to allow a suer to define
     * default values for variables that are not always available, filtering out always available variables for which default
     * values would not make sense.
     */
    public isAlwaysAvailable() {
        return this.always_available;
    }

    /**
     * For variables that are always available, returns an empty string.
     */
    public getAvailabilityText() {
        return "";
    }

    /**
     * Same as getAvailabilityText(), but removes HTML from the result.
     */
    public getAvailabilityTextPlain(): string {
        return this.getAvailabilityText().replace(/<\/?strong>/ig, ""); // Remove <strong> and </strong> markings from the help text
    }
}

interface IArguments {
    [key: string]: any;
}

/**
 * key = string, parameter name
 * value = boolean, is the parameter mandatory or not?
 */
export interface IParameters {
    [key: string]: {
        /** What data type is allowed. (New types can be added later). Should be omitted, if 'options' is used. */
        type?: "string" | "integer";
        /** This can define static values for this parameter. Should be omitted, if 'type' is used. */
        options?: string[];
        /** Is this parameter mandatory? */
        required: boolean;
    };
}

export interface VariableValueResult {
    value: string | null,
    error_messages: string[],

    /** In practise, this is true every time error_messages is empty, so this is just a shorthand so that error_messages.length does not need to be checked by the consumer. */
    succeeded: boolean,
}

export interface VariableDefaultValueConfiguration {
    type: "show-errors" | "cancel-silently" | "value",
    value: string,
}
