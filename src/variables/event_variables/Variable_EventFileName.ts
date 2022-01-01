import {EventVariable} from "./EventVariable";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";

export class Variable_EventFileName extends EventVariable {
    static variable_name = "event_file_name";
    static help_text = "Gives the selected file name with a file extension. If you need it without the extension, use {{event_title}} instead.";

    protected static supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        return (this.sc_event as SC_Event_FileMenu).getFile().name;
    }
}