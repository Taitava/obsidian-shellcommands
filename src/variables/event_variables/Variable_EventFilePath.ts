import {EventVariable} from "./EventVariable";
import {getSC_Event} from "../../events/SC_EventList";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {getFilePath} from "../VariableHelpers";
import {TFile} from "obsidian";
import {IParameters} from "../ShellCommandVariable";

export class Variable_EventFilePath extends EventVariable {
    static variable_name = "event_file_path";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const file: TFile = (this.sc_event as SC_Event_FileMenu).getFile();
        return getFilePath(this.app, file, this.arguments.mode);
    }
}