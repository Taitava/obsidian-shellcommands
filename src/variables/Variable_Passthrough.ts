import {IParameters, Variable} from "./Variable";

export class Variable_Passthrough extends Variable {
    public variable_name = "passthrough";
    public help_text = "Gives the same value that is passed as an argument. Used for testing special characters' escaping.";

    protected static readonly parameters: IParameters = {
        value: {
            type: "string",
            required: true,
        }
    };

    protected arguments: {
        value: string,
    };

    protected generateValue(): string {
        // Simply return the argument that was received.
        return this.arguments.value;
    }

    public getAvailabilityText() {
        return "<strong>Only available</strong> in debug mode.";
    }
}