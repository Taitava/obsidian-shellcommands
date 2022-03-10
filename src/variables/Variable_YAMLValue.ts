import {IParameters} from "./Variable";
import {FileVariable} from "./FileVariable";
import {getFileYAMLValue} from "./VariableHelpers";

export class Variable_YAMLValue extends FileVariable {
    public variable_name = "yaml_value";
    public help_text = "Reads a single value from the current file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        property_name: string;
    }

    protected generateValue(): string {
        const active_file = this.getFile();
        if (active_file) {
            // We do have an active file
            const result = getFileYAMLValue(this.app, active_file, this.arguments.property_name);
            if (Array.isArray(result)) {
                // The result contains error message(s).
                this.newErrorMessages(result as string[]);
                return null;
            } else {
                // The result is ok, it's a string.
                return result as string;
            }
        } else {
            // No file is active at the moment
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }

}