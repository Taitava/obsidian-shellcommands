/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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
import {Documentation} from "../Documentation";
import {EOL} from "os";
import {Shell} from "../shells/Shell";
import {tryTo} from "../Common";

/**
 * Variables that can be used to inject values to shell commands using {{variable:argument}} syntax.
 */
export abstract class Variable {
    private static readonly parameter_separator = ":";
    protected readonly app: App;
    public variable_name: string;
    public help_text: string;

    /**
     * If this is false, the variable can be assigned a default value that can be used in situations where the variable is unavailable.
     * TODO: Set to false, as most Variables are not always available. Then remove all 'always_available = false' lines from subclasses, and add 'always_available = true' to those subclasses that need it.
     * @protected
     */
    protected always_available = true;

    /**
     * A definition for what parameters this variables takes.
     * @protected
     */
    protected static readonly parameters: IParameters = {};

    constructor(
        protected readonly plugin: SC_Plugin,
    ) {
        this.app = plugin.app;
    }

    public getValue(
        shell: Shell,
        t_shell_command: TShellCommand | null = null,
        sc_event: SC_Event | null = null,
        variableArguments: IRawArguments = {},

        /**
         * Will parse variables in a default value (only used if this variable is not available this time). The callback
         * is only used, if t_shell_command is given. Set to null, if no variable parsing is needed for default values.
         * */
        default_value_parser: ((content: string) => Promise<ParsingResult>) | null = null,
    ): Promise<VariableValueResult> {

        return new Promise<VariableValueResult>((resolve) => {
            // Cast arguments (if any) to their correct data types
            const castedArguments = this.castArguments(variableArguments);

            // Generate a value, or catch an exception if one occurs.
            this.generateValue(shell, castedArguments, sc_event).then((value: string | null) => {
                // Value generation succeeded.
                return resolve({
                    value: value,
                    error_messages: [],
                    succeeded: true,
                });
            }).catch((error) => {
                // Caught a VariableError or an Error.
                if (error instanceof VariableError) {
                    // The variable is not available in this situation.
                    debugLog(this.constructor.name + ".getValue(): Caught a VariableError and will determine how to handle it: " + error.message);

                    // Check what should be done.
                    const default_value_configuration = this.getDefaultValueConfiguration(t_shell_command);
                    const default_value_type = default_value_configuration ? default_value_configuration.type : "show-errors";
                    const debug_message_base = "Variable " + this.getFullName() + " is not available. ";
                    switch (default_value_type) {
                        case "show-errors":
                            // Generate error messages by calling generateValue().
                            debugLog(debug_message_base + "Will prevent shell command execution and show visible error messages.");
                            return resolve({
                                value: null,
                                error_messages: [error.message], // Currently, error_messages will never contain multiple messages. TODO: Consider renaming error_messages to singular form.
                                succeeded: false,
                            });
                        case "cancel-silently":
                            // Prevent execution, but do not show any errors
                            debugLog(debug_message_base + "Will prevent shell command execution silently without visible error messages.");
                            return resolve({
                                value: null,
                                error_messages: [],
                                succeeded: false,
                            });
                        case "value":
                            // Return a default value.
                            if (!default_value_configuration) {
                                // This should not happen, because default_value_type is never "value" when default_value_configuration is undefined or null.
                                // This check is just for TypeScript compiler to understand that default_value_configuration is defined when it's accessed below.
                                throw new Error("Default value configuration is undefined.");
                            }
                            debugLog(debug_message_base + "Will use a default value: " + default_value_configuration.value);
                            if (default_value_parser) {
                                // Parse possible variables in the default value.
                                default_value_parser(default_value_configuration.value).then((default_value_parsing_result: ParsingResult) => {
                                    return resolve({
                                        value:
                                            default_value_parsing_result.succeeded
                                                ? default_value_parsing_result.parsed_content
                                                : default_value_parsing_result.original_content
                                        ,
                                        error_messages: default_value_parsing_result.error_messages,
                                        succeeded: default_value_parsing_result.succeeded,
                                    });
                                });

                            } else {
                                // No variable parsing is wanted.
                                return resolve({
                                    value: default_value_configuration.value,
                                    error_messages: [],
                                    succeeded: true,
                                });
                            }
                            break;
                        default:
                            throw new Error("Unrecognised default value type: " + default_value_type);
                    }
                } else {
                    // A program logic error has happened.
                    debugLog(this.constructor.name + ".getValue(): Caught an unrecognised error of class: " + error.constructor.name + ". Will rethrow it.");
                    throw error;
                }
            });
        });
    }

    /**
     * TODO: Consider can the sc_event parameter be moved so that it would only exist in EventVariable and it's child classes? Same for getValue() method.
     */
    protected abstract generateValue(
        shell: Shell,
        variableArguments: ICastedArguments,
        sc_event: SC_Event | null,
    ): Promise<string>;

    /**
     * Called from parseVariableSynchronously(), only used on some special Variables that are not included in
     * loadVariables()/SC_Plugin.getVariables().
     *
     * Can only support non-async Variables. Also, parameters are not supported, at least at the moment.
     */
    public getValueSynchronously(): VariableValueResult {
        return tryTo((): VariableValueResult => ({
                value: this.generateValueSynchronously(),
                succeeded: true,
                error_messages: [],
            }),
        (variableError: VariableError): VariableValueResult => ({
                value: null,
                succeeded: false,
                error_messages: [variableError.message],
            }),
            VariableError
        );
    }

    /**
     * Variables that support parseVariableSynchronously() should define this. Most Variables don't need this.
     */
    protected generateValueSynchronously(): string {
        throw new Error("generateValueSynchronously() is not implemented for " + this.constructor.name + ".");
        // Use Error instead of VariableError, because this is not a problem that a user could fix. It's a program error.
    }

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
     * @param variableArguments String typed arguments. Arguments that should be typed otherly, will be cast to other types. Then all arguments are returned.
     */
    public castArguments(variableArguments: IRawArguments): ICastedArguments {
        const castedArguments: ICastedArguments = {};
        for (const parameterName of Object.getOwnPropertyNames(variableArguments)) {
            const parameter_type = this.getParameters()[parameterName].type ?? "string"; // If the variable uses "options" instead of "type", then the type is always "string".
            const argument = variableArguments[parameterName];
            switch (parameter_type) {
                case "string":
                    castedArguments[parameterName] = argument;
                    break;
                case "integer":
                    castedArguments[parameterName] = parseInt(argument);
                    break;
            }
        }
        return castedArguments;
    }

    /**
     * Creates a VariableError and passes it to a rejector function, which will pass the VariableError to Variable.getValue().
     * Then it will be handled there according to user preferences.
     *
     * @param message
     * @param rejector
     * @protected
     */
    protected reject(message: string, rejector: (error: VariableError) => void): void {
        rejector(this.newVariableError(message));
    }

    /**
     * Similar to Variable.reject(), but uses a traditional throw. Can be used in async methods. For methods that create
     * Promises manually, Variable.reject() should be used, because errors thrown in manually created Promises are not caught
     * by Variable.getValue()'s Promise.catch() callback.
     *
     * @param message
     * @protected
     */
    protected throw(message: string): never {
        throw this.newVariableError(message);
    }

    private newVariableError(message: string) {
        const prefix = this.getFullName() + ": ";
        return new VariableError(prefix + message);
    }

    public getAutocompleteItems(): IAutocompleteItem[] {

        // Check if the variable has at least one _mandatory_ parameter.
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
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped version of the variable
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + parameter_indicator + "}}",
                help_text: (this.help_text + " " + this.getAvailabilityText()).trim(), // .trim() removes " " if help_text or getAvailabilityText() is empty.
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
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
    public getFullName(withExclamationMark = false, variableArguments?: string[] | string): string {
        if (typeof variableArguments === "string") {
            variableArguments = [variableArguments];
        }
        const variableArgumentsString = variableArguments?.length ? ":" + variableArguments.join(":") : ""; // Check .length too: empty array should not cause a colon to appear.
        const opening = withExclamationMark ? "{{!" : "{{";
        return opening + this.variable_name + variableArgumentsString + "}}";
    }

    /**
     * TODO: Create a class BuiltinVariable and move this method there. This should not be present for CustomVariables.
     */
    public getDocumentationLink(): string {
        return Documentation.variables.folder + encodeURI(this.getFullName());
    }

    /**
     * TODO: Create a class BuiltinVariable and move this method there. This should not be present for CustomVariables.
     */
    public createDocumentationLinkElement(container: HTMLElement
    ): void {
        const description =
            this.getFullName() + ": " + this.help_text
            + EOL + EOL +
            "Click for external documentation."
        ;
        container.createEl("a", {
            text: this.getFullName(),
            href: this.getDocumentationLink(),
            attr: {"aria-label": description},
        });
    }

    /**
     * Returns a unique string that can be used in default value configurations.
     * @return Normal variable name, if this is a built-in variable; or an ID string if this is a CustomVariable.
     */
    public getIdentifier(): string {
        return this.getFullName();
    }

    /**
     * This can be used to determine if the variable can sometimes be unavailable. Used in settings to allow a user to define
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

    /**
     * Returns a default value configuration object that should be used if a shell command does not define its own
     * default value configuration object.
     */
    public getGlobalDefaultValueConfiguration(): GlobalVariableDefaultValueConfiguration | null {
        // Works for built-in variables only. CustomVariable class needs to override this method and not call the parent!
        return this.plugin.settings.builtin_variables[this.getIdentifier()]?.default_value; // Can return null
    }

    /**
     * @param tShellCommand If defined, a default value configuration is first tried to be found from the TShellCommand. If null, or if the TShellCommand didn't contain a configuration (or if the configuration's type is "inherit"), returns a configuration from getGlobalDefaultValueConfiguration().
     * @return Returns an object complying to GlobalVariableDefaultValueConfiguration even if the configuration was found from a TShellCommand, because the returned configuration will never have type "inherit".
     */
    public getDefaultValueConfiguration(tShellCommand: TShellCommand | null): GlobalVariableDefaultValueConfiguration | null {
        const defaultValueConfigurationFromShellCommand = tShellCommand?.getDefaultValueConfigurationForVariable(this); // tShellCommand can be null, or the method can return null.
        if (!defaultValueConfigurationFromShellCommand || defaultValueConfigurationFromShellCommand.type === "inherit") {
            return this.getGlobalDefaultValueConfiguration(); // Also this method can return null.
        }
        return defaultValueConfigurationFromShellCommand as GlobalVariableDefaultValueConfiguration; // For some reason TypeScript does not realize that defaultValueConfigurationFromShellCommand.type cannot be "inherit" in this situation, so the 'as ...' part is needed.
    }
    
    /**
     * Takes an array of IAutocompleteItems. Will add `{{!` (unescaped variable) versions for each {{variable}} it encounters.
     * The additions are done in-place, so the method returns nothing.
     *
     * @protected
     */
    protected static supplementAutocompleteItems(autocompleteItems: IAutocompleteItem[]): void {
        const originalLength: number = autocompleteItems.length;
        for (let autocompleteItemIndex = 0; autocompleteItemIndex < originalLength; autocompleteItemIndex++) {
            const autocompleteItem: IAutocompleteItem = autocompleteItems[autocompleteItemIndex];
            if (autocompleteItem.value.match(/^\{\{[[^!].*}}$/)) {
                // This is a {{variable}} which does not have ! as the first character after {{.
                // Duplicate it.
                const duplicatedAutocompleteItem: IAutocompleteItem = Object.assign({}, autocompleteItem,<IAutocompleteItem>{
                    value: autocompleteItem.value.replace(/^\{\{/, "{{!"),
                    type: "unescaped-variable",
                });
                autocompleteItems.push(duplicatedAutocompleteItem);
            }
        }
    }
}

/**
 * Arguments that are cast to their designed data types, i.e. strings or integers at the moment.
 * TODO: Rename to CastedVariableArguments.
 */
export interface ICastedArguments {
    [key: string]: unknown;
}

/**
 * Same as ICastedArguments, but not yet cast to the target data types.
 * TODO: Rename to RawVariableArguments.
 */
export interface IRawArguments {
    [key: string]: string;
}

/**
 * key = string, parameter name
 * value = boolean, is the parameter mandatory or not?
 * TODO: Rename to VariableParameters.
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

/**
 * Thrown when Variables encounter errors that users should solve. Variable.getValue() will catch these and show to user
 * (unless errors are ignored).
 */
export class VariableError extends Error {}

export type VariableDefaultValueType = "show-errors" | "cancel-silently" | "value";

export type VariableDefaultValueTypeWithInherit = VariableDefaultValueType | "inherit";

/**
 * Interface for a configuration object that can opt for retrieving the configuration from an upper level by defining its
 * 'type' property have value 'inherit'.
 */
export interface InheritableVariableDefaultValueConfiguration {
    type: VariableDefaultValueTypeWithInherit,
    value: string,
}

/**
 * Interface for a configuration object that is on a root level and so cannot inherit configuration from an upper level,
 * because there is no upper level. Objects implementing this interface cannot set their 'type' property to 'inherit'.
 */
export interface GlobalVariableDefaultValueConfiguration {
    type: VariableDefaultValueType,
    value: string,
}
