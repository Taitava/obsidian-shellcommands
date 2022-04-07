import {
    EventVariable,
    SC_Event_FileMenu,
} from "src/imports";

export class Variable_EventFileName extends EventVariable {
    public variable_name = "event_file_name";
    public help_text = "Gives the selected file name with a file extension. If you need it without the extension, use {{event_title}} instead.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        return sc_event.getFile().name;
    }
}