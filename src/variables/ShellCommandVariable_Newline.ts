import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";
import {isWindows} from "../Common";
import {EOL} from "os";

export class ShellCommandVariable_Newline extends ShellCommandVariable {
    name = "newline";
    protected readonly parameters: IParameters = {
        count: {
            type: "integer",
            required: false,
        },
    }

    protected arguments = {
        count: 1,
    }

    getValue(): string {
        let count = this.arguments.count;
        if (undefined === count || count < 1) {
            this.newErrorMessage("Argument 'count' must be at least 1.")
            return null;
        } else if (count > 100) {
            // Too big count can cause the application to go unstable.
            this.newErrorMessage("Argument 'count' cannot be over 100.")
            return null;
        }

        let newline: string;
        if (isWindows()) {
            // Windows
            // CMD accepts escaping a CR+LF with ^
            // TODO: When support for PowerShell is added, check which shell is used and use "`n" as a newline when PowerShell is used: https://stackoverflow.com/a/11876921/2754026 (Note that the SO answer says to use quotes around `n, but it works even without them)

            // FIXME: This does not work:
            // newline = "^" + EOL;

            this.newErrorMessage("This variable does not currently work on Windows.")
            return null;
        } else {
            // Linux or Mac
            newline = "\\n";
        }
        return newline.repeat(count);
    }
}
addShellCommandVariableInstructions(
    "{{newline:count}}",
    "Gives an OS/shell specific newline marker. Count can be defined to get multiple newlines, or omitted if only one is needed.",
);