import {getEditor} from "../Common";
import {IParameters, Variable} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";

export class Variable_CaretPosition extends Variable {
    public variable_name = "caret_position";
    public help_text = "Gives the line number and column position of the current caret position as 'line:column'. Get only the line number using {{caret_position:line}}, and only the column with {{caret_position:column}}. Line and column numbers are 1-indexed.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["line", "column"],
            required: false,
        },
    };

    protected arguments: {
        mode: string;
    }

    protected generateValue(): string {
        // Check that we are able to get an editor
        const editor = getEditor(this.app);
        if (null === editor) {
            // Nope.
            this.newErrorMessage("Could not get an editor instance! Please raise an issue in GitHub.");
            return null;
        }

        const position = editor.getCursor('to');
        const line = position.line + 1; // editor position is zero-indexed, line numbers are 1-indexed
        const column = position.ch + 1; // editor position is zero-indexed, column positions are 1-indexed
        
        if (Object.keys(this.arguments).length > 0) {
            switch (this.arguments.mode.toLowerCase()) {
                case "line":
                    return `${line}`;
                case "column":
                    return `${column}`;
                default:
                    this.newErrorMessage("Unrecognised argument: "+this.arguments.mode);
                    return null;
            }
        } else {
            // default case when no args provided
            return `${line}:${column}`;
        }
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + "}}",
                help_text: "Gives the line number and column position of the current caret position as 'line:column'. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable"
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":line}}",
                help_text: "Gives the line number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable"
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":column}}",
                help_text: "Gives the column number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable"
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + "}}",
                help_text: "Gives the line number and column position of the current caret position as 'line:column'. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":line}}",
                help_text: "Gives the line number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":column}}",
                help_text: "Gives the column number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{caret_position}}</strong>, <strong>{{caret_position:line}}</strong> or <strong>{{caret_position:column}}</strong>";
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when a note pane is open, not in graph view, nor when viewing non-text files.";
    }
}