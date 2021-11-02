import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";
import {DEBUG_ON} from "../Debug";

export class ShellCommandVariable_Passthrough extends ShellCommandVariable {
    name = "passthrough";

    protected readonly parameters: IParameters = {
        value: {
            type: "string",
            required: true,
        }
    };

    protected arguments: {
        value: string,
    };

    generateValue(): string {
        // Simply return the argument that was received.
        return this.arguments.value;
    }
}
if (DEBUG_ON) {
    // FIXME: Adding instructions does not work because DEBUG_ON is false before settings are loaded.
    // Fix by refactoring variables so that the instruction definition is a method in the variable class.
    addShellCommandVariableInstructions(
        "{{passthrough:value}}",
        "Gives the same value that is passed as an argument. Used for testing special characters' escaping. Available in debug mode only.",
    );
}