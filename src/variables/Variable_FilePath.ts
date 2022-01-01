import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {FileVariable} from "./FileVariable";
import {getFilePath} from "./VariableHelpers";

export class Variable_FilePath extends FileVariable{
    static variable_name = "file_path";
    static help_text = "Gives path to the current file, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    generateValue(): string|null {
        let active_file = this.getFile();
        if (active_file) {
            return getFilePath(this.app, active_file, this.arguments.mode);
        } else {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{file_path:relative}}</strong> or <strong>{{file_path:absolute}}</strong>";
    }
}