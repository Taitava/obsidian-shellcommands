import {IParameters} from "./Variable";
import {FileVariable} from "./FileVariable";
import {getFileTags} from "./VariableHelpers";

export class Variable_Tags extends FileVariable {
    public static variable_name = "tags";
    public static help_text = "Gives all tags defined in the current note. Replace the \"separator\" part with a comma, space or whatever characters you want to use as a separator between tags. A separator is always needed to be defined.";

    protected static readonly parameters: IParameters = {
        separator: {
            type: "string",
            required: true,
        }
    };

    protected arguments: {
        separator: string,
    };

    protected generateValue(): string {
        const active_file = this.getFile();
        if (active_file) {
            // We do have an active file
            return getFileTags(this.app, active_file).join(this.arguments.separator);
        } else {
            // No file is active at the moment
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}