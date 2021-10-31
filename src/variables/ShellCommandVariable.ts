import {App} from "obsidian";
import ShellCommandsPlugin from "../main";
import {escapeValue} from "./escapers/EscapeValue";

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


export abstract class ShellCommandVariable {
    private readonly parameter_separator = ":";
    readonly plugin: ShellCommandsPlugin;
    readonly app: App;
    private error_messages: string[] = [];
    readonly name: string;
    private shell: string;

    /**
     * A definition for what parameters this variables takes.
     * @protected
     */
    protected readonly parameters: IParameters = {};

    /**
     * This contains actual values for parameters.
     * @protected
     */
    protected arguments: IArguments = {};

    /**
     *
     * @param plugin
     * @param shell Used to determine what kind of escaping should be used.
     */
    constructor(plugin: ShellCommandsPlugin, shell: string) {
        this.plugin = plugin
        this.app = plugin.app;
        this.shell = shell;
    }

    public getValue(escape: boolean) {
        let raw_value = this.generateValue();
        if (null === raw_value) {
            // Some error(s) has occurred when generating the variable's value.
            // Prevent passing null to escapeValue().
            return null;
        }
        if (escape) {
            // Value should be escaped.
            return escapeValue(this.shell, raw_value);
        } else {
            // A raw, unescaped value is expected.
            return raw_value;
        }
    }

    protected abstract generateValue(): string|null;

    getPattern() {
        const error_prefix = this.name + ".getPattern(): ";
        let pattern = '\{\{\!?' + this.name;
        for (let parameter_name in this.parameters) {
            const parameter = this.parameters[parameter_name];
            let parameter_type_pattern: string = this.parameter_separator;  // Here this.parameter_separator (= : ) is included in the parameter value just so that it's not needed to do nested parenthesis to accomplish possible optionality: (:())?. parseShellCommandVariables() will remove the leading : .

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
                parameter_type_pattern += parameter.options.join("|" + this.parameter_separator); // E.g. "absolute|:relative" for {{file_path:mode}} variable's 'mode' parameter.
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
        pattern += '\}\}';
        return pattern;
    }

    public getParameterNames() {
        return Object.getOwnPropertyNames(this.parameters);
    }

    /**
     * @param parameter_name
     * @param argument At this point 'argument' is always a string, but this method may convert it to another data type, depending on the parameter's data type.
     */
    public setArgument(parameter_name: string, argument: string) {
        const parameter_type = this.parameters[parameter_name].type ?? "string"; // If the variable uses "options" instead of "type", then the type is always "string".
        switch (parameter_type) {
            case "string":
                this.arguments[parameter_name] = argument;
                break;
            case "integer":
                this.arguments[parameter_name] = parseInt(argument);
                break;
        }
    }

    /**
     * Note that error messages can only exist after getValue() is called!
     */
    getErrorMessages() {
        return this.error_messages;
    }

    protected newErrorMessage(message: string) {
        let prefix = "{{" + this.name + "}}: ";
        this.error_messages.push(prefix + message);
    }
}
