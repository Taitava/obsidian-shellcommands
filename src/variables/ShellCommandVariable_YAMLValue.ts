import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_YAMLValue extends ShellCommandVariable {
    static variable_name = "yaml_value";
    static help_text = "Reads a single value from the current file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        property_name: string;
    }

    generateValue(): string {
        const property_path = this.arguments.property_name.split(".");

        // Validate all property names along the path
        let property_name_failed = false;
        property_path.forEach((property_name: string) => {
            if (0 === property_name.length) {
                this.newErrorMessage("YAML property '" + this.arguments.property_name + "' has an empty property name. Remove possible double dots or a preceding/trailing dot.");
                property_name_failed = true;
            }
        });
        if (property_name_failed) {
            return null;
        }

        const active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            // We do have an active file
            const frontmatter = this.app.metadataCache.getFileCache(active_file)?.frontmatter;
            // Check that a YAML section is available in the file
            if (undefined === frontmatter) {
                // No it ain't.
                this.newErrorMessage("No YAML frontmatter section is defined for the current file.");
                return null;
            } else {
                // A YAML section is available.
                // Read the property's value.
                return nested_read(property_path, frontmatter, this);
            }
        } else {
            // No file is active at the moment
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }

        function nested_read(property_path: string[], yaml_object: { [key: string]: string | number | object }, _this: ShellCommandVariable_YAMLValue): string | null {
            let property_name: string = property_path.shift();

            // Check if the property name is a negative numeric index.
            if (property_name.match(/^-\d+$/)) {
                // The property name is a negative number.
                // Check that yaml_object contains at least one element.
                const yaml_object_keys = Object.getOwnPropertyNames(yaml_object).filter(key => key !== "length"); // All _really custom_ yaml keys, not .length
                if (yaml_object_keys.length > 0) {
                    // Check if yaml_object happens to be an indexed list.
                    let is_indexed_list = true;
                    yaml_object_keys.forEach((key) => {
                        if (!key.match(/^\d+$/)) {
                            // At least one non-numeric key was found, so consider the object not to be an indexed list.
                            is_indexed_list = false;
                        }
                    });
                    if (is_indexed_list) {
                        // The object is an indexed list and property_name is a negative index number.
                        // Translate property_name to a positive index from the end of the list.
                        property_name = Math.max(0, // If a greatly negative index is used (e.g. -999), don't allow the new index to be negative again.
                            yaml_object_keys.length
                            + parseInt(property_name) // Although + is used, this will be a subtraction, because property_name is prefixed with a minus.
                        ).toString();
                    }
                }
            }

            // Get a value
            const property_value = yaml_object[property_name];

            // Check if the value is either: not found, object, or literal.
            if (undefined === property_value) {
                // Property was not found.
                _this.newErrorMessage("YAML property '" + property_name + "' is not found.");
                return null;
            } else if ("object" === typeof property_value) {
                // The value is an object.
                // Check if we have still dot notation parts left in the property path.
                if (0 === property_path.length) {
                    // No dot notation parts are left.
                    // Freak out.
                    const nested_elements_keys = Object.getOwnPropertyNames(property_value);
                    if (nested_elements_keys.length > 0) {
                        _this.newErrorMessage("YAML property '" + property_name + "' contains a nested element with keys: " + nested_elements_keys.join(", ") + ". Use e.g. '" + _this.arguments.property_name + "." + nested_elements_keys[0] + "' to get its value.");
                    } else {
                        _this.newErrorMessage("YAML property '" + property_name + "' contains a nested element. Use a property name that points to a literal value instead.");
                    }
                    return null;
                } else {
                    // Dot notation path still has another property name left, so continue the hunt.
                    return nested_read(property_path, property_value as { [key: string]: string | number | object }, _this);
                }
            } else {
                // The value is literal, i.e. a string or number.
                if (property_path.length > 0) {
                    _this.newErrorMessage("YAML property '" + property_name + "' gives already a literal value '" + property_value.toString() + "', but the argument '" + _this.arguments.property_name + "' assumes the property would contain a nested element with the key '" + property_path[0] + "'.");
                    return null;
                } else {
                    return property_value.toString();
                }
            }
        }
    }

}