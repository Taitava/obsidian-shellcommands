import {EventVariable} from "./EventVariable";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";

export class Variable_EventFileName extends EventVariable {
    public variable_name = "event_file_name";
    public help_text = "Gives the selected file name with a file extension. If you need it without the extension, use {{event_title}} instead.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        return (this.sc_event as SC_Event_FileMenu).getFile().name;
    }
}