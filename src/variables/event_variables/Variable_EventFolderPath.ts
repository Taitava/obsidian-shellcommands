import {
    EventVariable,
    getFolderPath,
    IAutocompleteItem,
    IParameters,
    SC_Event_FileMenu,
    SC_Event_FolderMenu,
} from "src/imports";

export class Variable_EventFolderPath extends EventVariable {
    public variable_name = "event_folder_path";
    public help_text = "File menu: Gives path to the selected file's parent folder. Folder menu: Gives path to the selected folder. The path is either absolute from the root of the file system, or relative from the root of the Obsidian vault.";

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
        SC_Event_FolderMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu | SC_Event_FolderMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        const folder = sc_event.getFolder();
        return getFolderPath(this.app, folder, this.arguments.mode);
    }

    public getAutocompleteItems() {
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