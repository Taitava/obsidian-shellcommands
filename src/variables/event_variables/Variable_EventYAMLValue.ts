import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {EventVariable} from "./EventVariable";
import {getFileYAMLValue} from "../VariableHelpers";
import {IParameters} from "../Variable";

export class Variable_EventYAMLValue extends EventVariable {
    public static variable_name = "event_yaml_value";
    public static help_text = "Reads a single value from the selected file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        property_name: string;
    }

    protected static supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const file = (this.sc_event as SC_Event_FileMenu).getFile();
        const result = getFileYAMLValue(this.app, file, this.arguments.property_name);
        if (Array.isArray(result)) {
            // The result contains error message(s).
            this.newErrorMessages(result as string[]);
            return null;
        } else {
            // The result is ok, it's a string.
            return result as string;
        }
    }
}