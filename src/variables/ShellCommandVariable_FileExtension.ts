import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";

export class ShellCommandVariable_FileExtension extends ShellCommandVariable{
    static variable_name = "file_extension";
    static help_text = "Gives the current file name's ending. Use {{file_extension:with-dot}} to include a preceding dot. If the extension is empty, no dot is added. {{file_extension:no-dot}} never includes a dot.";

    protected static parameters: IParameters = {
        "dot": {
            options: ["with-dot", "no-dot"],
            required: true,
        },
    };

    protected arguments: {
        "dot": "with-dot" | "no-dot",
    }

    generateValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        const file_extension = file.extension;

        // Should the extension be given with or without a dot?
        if (this.arguments.dot === "with-dot") {
            // A preceding dot must be included.
            if (file_extension.length > 0) {
                // But only if the extension is not empty.
                return "." + file_extension;
            }
        }

        // No dot should be included, or the extension is empty
        return file_extension;
    }

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dot}}",
                help_text: "Gives the current file name's ending without a preceding dot.",
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dot}}",
                help_text: "Gives the current file name's ending with a preceding dot. If the extension is empty, no dot is included.",
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dot}}",
                help_text: "Gives the current file name's ending without a preceding dot.",
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dot}}",
                help_text: "Gives the current file name's ending with a preceding dot. If the extension is empty, no dot is included.",
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

}
addShellCommandVariableInstructions(
    "{{file_extension:with-dot}} or {{file_extension:no-dot}}",
    ShellCommandVariable_FileExtension.help_text,
);