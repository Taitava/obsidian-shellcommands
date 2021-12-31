import {EventVariable} from "./EventVariable";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {getFilePath} from "../VariableHelpers";
import {TFile} from "obsidian";
import {IParameters} from "../ShellCommandVariable";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";

export class Variable_EventFilePath extends EventVariable {
    static variable_name = "event_file_path";
    static help_text = "Gives path to the selected file, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

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

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the selected file, absolute from the root of the file system.",
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the selected file, relative from the root of the Obsidian vault.",
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the selected file, absolute from the root of the file system.",
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the selected file, relative from the root of the Obsidian vault.",
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_file_path:relative}}</strong> or <strong>{{event_file_path:absolute}}</strong>";
    }
}