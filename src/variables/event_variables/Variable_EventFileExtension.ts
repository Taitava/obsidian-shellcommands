import {EventVariable} from "./EventVariable";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {getFileExtension} from "../VariableHelpers";
import {IParameters} from "../ShellCommandVariable";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";

export class Variable_EventFileExtension extends EventVariable {
    static variable_name = "event_file_extension";
    static help_text = "Gives the selected file name's ending. Use {{event_file_extension:with-dot}} to include a preceding dot. If the extension is empty, no dot is added. {{event_file_extension:no-dot}} never includes a dot.";

    protected static parameters: IParameters = {
        "dot": {
            options: ["with-dot", "no-dot"],
            required: true,
        },
    };

    protected arguments: {
        "dot": "with-dot" | "no-dot",
    }

    protected static supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const file = (this.sc_event as SC_Event_FileMenu).getFile();
        return getFileExtension(file, this.arguments.dot === "with-dot");
    }

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dot}}",
                help_text: "Gives the selected file name's ending without a preceding dot. ",
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dot}}",
                help_text: "Gives the selected file name's ending with a preceding dot. If the extension is empty, no dot is included.",
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dot}}",
                help_text: "Gives the selected file name's ending without a preceding dot.",
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dot}}",
                help_text: "Gives the selected file name's ending with a preceding dot. If the extension is empty, no dot is included.",
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_file_extension:with-dot}}</strong> or <strong>{{event_file_extension:no-dot}}</strong>";
    }

}