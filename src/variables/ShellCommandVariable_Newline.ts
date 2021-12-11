import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";
import {EOL} from "os";
import {extractFileName} from "../Common";

export class ShellCommandVariable_Newline extends ShellCommandVariable {
    static variable_name = "newline";
    static help_text = "A literal linebreak specific to your operating system. Use an optional :count argument if you want more than one.";

    protected static readonly parameters: IParameters = {
        count: {
            type: "integer",
            required: false,
        },
    }

    protected arguments = {
        count: 1,
    }

    generateValue(): string {
        // Ensure CMD is not used
        const shell = extractFileName(this.shell.toLowerCase());
        if ("cmd.exe" === shell) {
            this.newErrorMessage("Newlines are not supported in CMD. Use e.g. PowerShell instead.");
            return null;
        }

        // Ensure count is ok
        if (this.arguments.count <= 0) {
            // Incorrect count
            this.newErrorMessage("Count must be at least 1.");
            return null;
        } else if (this.arguments.count > 100) {
            // Too big count can cause the application to go unstable.
            this.newErrorMessage("Argument 'count' cannot be over 100.")
            return null;
        } else {
            // Count is ok
            return EOL.repeat(this.arguments.count); // Note that on Bash, Dash, Zsh etc. the newlines will be changed to \n or \r in ShEscaper class. On PowerShell no replacing will be done.
        }
    }
}
addShellCommandVariableInstructions(
    "{{newline}} or {{newline:count}}",
    ShellCommandVariable_Newline.help_text,
);