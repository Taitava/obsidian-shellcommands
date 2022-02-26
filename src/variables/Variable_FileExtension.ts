import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {getFileExtension} from "./VariableHelpers";
import {FileVariable} from "./FileVariable";

export class Variable_FileExtension extends FileVariable {
    public static variable_name = "file_extension";
    public static help_text = "Gives the current file name's ending. Use {{file_extension:with-dot}} to include a preceding dot. If the extension is empty, no dot is added. {{file_extension:no-dot}} never includes a dot.";

    protected static parameters: IParameters = {
        "dot": {
            options: ["with-dot", "no-dot"],
            required: true,
        },
    };

    protected arguments: {
        "dot": "with-dot" | "no-dot",
    }

    protected generateValue(): string {
        const file = this.getFile();
        if (!file) {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }

        return getFileExtension(file, this.arguments.dot === "with-dot");
    }

    public static getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dot}}",
                help_text: "Gives the current file name's ending without a preceding dot. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dot}}",
                help_text: "Gives the current file name's ending with a preceding dot. If the extension is empty, no dot is included. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dot}}",
                help_text: "Gives the current file name's ending without a preceding dot. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dot}}",
                help_text: "Gives the current file name's ending with a preceding dot. If the extension is empty, no dot is included. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{file_extension:with-dot}}</strong> or <strong>{{file_extension:no-dot}}</strong>";
    }
}