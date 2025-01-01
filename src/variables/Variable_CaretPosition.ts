/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025:
 *  - Vinay Rajur (created most of the content of the Variable_CaretPosition class)
 *  - Jarkko Linnanvirta (some minor/structural changes)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact:
 *  - Vinay Rajur: https://github.com/vrajur
 *  - Jarkko Linnanvirta: https://github.com/Taitava/
 */

import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {EditorVariable} from "./EditorVariable";
import {Editor} from "obsidian";
import {Shell} from "../shells/Shell";

export class Variable_CaretPosition extends EditorVariable {
    public variable_name = "caret_position";
    public help_text = "Gives the line number and column position of the current caret position as 'line:column'. Get only the line number using {{caret_position:line}}, and only the column with {{caret_position:column}}. Line and column numbers are 1-indexed.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["line", "column"],
            required: false,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {mode?: string},
    ): Promise<string> {
        // Check that we are able to get an editor
        const editor: Editor = this.getEditorOrThrow();

        const position = editor.getCursor('to');
        const line = position.line + 1; // editor position is zero-indexed, line numbers are 1-indexed
        const column = position.ch + 1; // editor position is zero-indexed, column positions are 1-indexed

        if (undefined !== castedArguments.mode) {
            switch (castedArguments.mode.toLowerCase()) {
                case "line":
                    return `${line}`;
                case "column":
                    return `${column}`;
                default:
                    this.throw("Unrecognised argument: "+castedArguments.mode);
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
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":line}}",
                help_text: "Gives the line number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":column}}",
                help_text: "Gives the column number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + "}}",
                help_text: "Gives the line number and column position of the current caret position as 'line:column'. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":line}}",
                help_text: "Gives the line number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":column}}",
                help_text: "Gives the column number of the current caret position. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{caret_position}}</strong>, <strong>{{caret_position:line}}</strong> or <strong>{{caret_position:column}}</strong>";
    }

    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Not available in preview mode.";
    }
}