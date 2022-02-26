import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {EventVariable} from "./EventVariable";
import {IParameters} from "../Variable";
import {getFileTags} from "../VariableHelpers";

export class Variable_EventTags extends EventVariable {
    public static variable_name = "event_tags";
    public static help_text = "Gives all tags defined in the selected note. Replace the \"separator\" part with a comma, space or whatever characters you want to use as a separator between tags. A separator is always needed to be defined.";

    protected static supported_sc_events = [
        SC_Event_FileMenu,
    ];

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
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const file = (this.sc_event as SC_Event_FileMenu).getFile();
        return getFileTags(this.app, file).join(this.arguments.separator);
    }
}