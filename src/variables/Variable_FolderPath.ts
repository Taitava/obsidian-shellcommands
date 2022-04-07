import {
    FolderVariable,
    getFolderPath,
    IAutocompleteItem,
    IParameters,
} from "src/imports";

export class Variable_FolderPath extends FolderVariable {
    public variable_name = "folder_path";
    public help_text = "Gives path to the current file's parent folder, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        }
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    protected generateValue(): string|null {
        const folder = this.getFolder();
        if (folder) {
            return getFolderPath(this.app, folder, this.arguments.mode);
        } else {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file's parent folder, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file's parent folder, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file's parent folder, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file's parent folder, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{folder_path:relative}}</strong> or <strong>{{folder_path:absolute}}</strong>";
    }
}