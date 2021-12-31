import {EventVariable} from "./EventVariable";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {getFileExtension} from "../VariableHelpers";
import {IParameters} from "../ShellCommandVariable";

export class Variable_EventFileExtension extends EventVariable {
    static variable_name = "event_file_extension";

    protected static parameters: IParameters = {
        "dot": {
            options: ["with-dot", "no-dot"],
            required: true,
        },
    };

    protected arguments: {
        "dot": "with-dot" | "no-dot",
    }

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const file = (this.sc_event as SC_Event_FileMenu).getFile();
        return getFileExtension(file, this.arguments.dot === "with-dot");
    }
}