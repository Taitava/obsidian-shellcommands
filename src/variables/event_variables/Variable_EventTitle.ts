import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {EventVariable} from "./EventVariable";

export class Variable_EventTitle extends EventVariable {
    static variable_name = "event_title";

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        return (this.sc_event as SC_Event_FileMenu).getFile().basename;
    }
}