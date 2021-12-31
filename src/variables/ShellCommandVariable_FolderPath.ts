import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {IParameters} from "./ShellCommandVariable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {ShellCommandFolderVariable} from "./ShellCommandFolderVariable";
import {getFolderPath} from "./VariableHelpers";

export class ShellCommandVariable_FolderPath extends ShellCommandFolderVariable {
    static variable_name = "folder_path";
    static help_text = "Gives path to the current file's parent folder, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        }
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    generateValue(): string|null {
        const folder = this.getFolder();
        if (folder) {
            return getFolderPath(this.app, folder, this.arguments.mode);
        } else {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file's parent folder, absolute from the root of the file system.",
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file's parent folder, relative from the root of the Obsidian vault.",
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file's parent folder, absolute from the root of the file system.",
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file's parent folder, relative from the root of the Obsidian vault.",
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }
}
addShellCommandVariableInstructions(
    "{{folder_path:relative}} or {{folder_path:absolute}}",
    ShellCommandVariable_FolderPath.help_text,
);