import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {getVaultAbsolutePath, normalizePath2} from "../Common";
import {IParameters} from "./ShellCommandVariable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {ShellCommandFileVariable} from "./ShellCommandFileVariable";

export class ShellCommandVariable_FilePath extends ShellCommandFileVariable{
    static variable_name = "file_path";
    static help_text = "Gives path to the current file, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected arguments: {
        mode: string;
    }

    generateValue(): string|null {
        let active_file = this.getFile();
        if (active_file) {
            switch (this.arguments.mode.toLowerCase()) {
                case "absolute":
                    return normalizePath2(getVaultAbsolutePath(this.app) + "/" + active_file.path);
                case "relative":
                    return normalizePath2(active_file.path); // Normalize to get a correct slash depending on platform. On Windows it should be \ .
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
                help_text: "Gives path to the current file, absolute from the root of the file system.",
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file, relative from the root of the Obsidian vault.",
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file, absolute from the root of the file system.",
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file, relative from the root of the Obsidian vault.",
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }
}
addShellCommandVariableInstructions(
    "{{file_path:relative}} or {{file_path:absolute}}",
    ShellCommandVariable_FilePath.help_text,
);