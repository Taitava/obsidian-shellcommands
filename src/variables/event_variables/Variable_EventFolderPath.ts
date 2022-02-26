import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "../../events/SC_Event_FolderMenu";
import {EventVariable} from "./EventVariable";
import {getFolderPath} from "../VariableHelpers";
import {IParameters} from "../Variable";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";

export class Variable_EventFolderPath extends EventVariable {
    public static variable_name = "event_folder_path";
    public static help_text = "File menu: Gives path to the selected file's parent folder. Folder menu: Gives path to the selected folder. The path is either absolute from the root of the file system, or relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    protected static supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FolderMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const folder = (this.sc_event as SC_Event_FileMenu | SC_Event_FolderMenu).getFolder();
        return getFolderPath(this.app, folder, this.arguments.mode);
    }

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "File menu: Gives path to the selected file's parent folder. Folder menu: Gives path to the selected folder. The path is absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "File menu: Gives path to the selected file's parent folder. Folder menu: Gives path to the selected folder. The path is relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "File menu: Gives path to the selected file's parent folder. Folder menu: Gives path to the selected folder. The path is absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "File menu: Gives path to the selected file's parent folder. Folder menu: Gives path to the selected folder. The path is relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_folder_path:relative}}</strong> or <strong>{{event_folder_path:absolute}}</strong>";
    }
}