import {
    EventVariable,
    SC_Event_FileMenu,
} from "src/imports";

export class Variable_EventTitle extends EventVariable {
    public variable_name = "event_title";
    public help_text = "Gives the current file name without a file extension. If you need it with the extension, use {{event_file_name}} instead.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        return sc_event.getFile().basename;
    }
}