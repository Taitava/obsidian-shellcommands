import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {getVaultAbsolutePath, normalizePath2} from "../Common";
import {IParameters} from "./ShellCommandVariable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {ShellCommandFolderVariable} from "./ShellCommandFolderVariable";

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
        mode: string;
    }

    generateValue(): string|null {
        const folder = this.getFolder();
        if (folder) {
            switch (this.arguments.mode.toLowerCase()) {
                case "absolute":
                    return normalizePath2(getVaultAbsolutePath(this.app) + "/" + folder.path);
                case "relative":
                    if (folder.isRoot()) {
                        // Obsidian API does not give a correct folder.path value for the vault's root folder.
                        // TODO: See this discussion and apply possible changes if something will come up: https://forum.obsidian.md/t/vault-root-folders-relative-path-gives/24857
                        return ".";
                    } else {
                        // This is a normal subfolder
                        return normalizePath2(folder.path); // Normalize to get a correct slash between directories depending on platform. On Windows it should be \ .
                    }
            }
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