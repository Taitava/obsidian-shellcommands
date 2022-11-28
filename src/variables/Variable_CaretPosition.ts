/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022:
 *  - Vinay Rajur (created most of the content of the Variable_CaretPosition class)
 *  - Jarkko Linnanvirta (some minor/structural changes)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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

import {getEditor} from "../Common";
import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {EditorVariable} from "./EditorVariable";

export class Variable_CaretPosition extends EditorVariable {
    public variable_name = "caret_position";
    public help_text = "Gives the line number and column position of the current caret position as 'line:column'. Get only the line number using {{caret_position:line}}, and only the column with {{caret_position:column}}. Line and column numbers are 1-indexed.";

    protected always_available = false;

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["line", "column"],
            required: false,
        },
    };

    protected arguments: {
        mode: string;
    }

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            // Check that we are able to get an editor
            if (!this.requireEditor() || !this.editor) { //  || !this.editor is only for making TypeScript compiler understand that this.editor exists later.
                // Nope.
                return resolve(null);
            }

            const position = this.editor.getCursor('to');
            const line = position.line + 1; // editor position is zero-indexed, line numbers are 1-indexed
            const column = position.ch + 1; // editor position is zero-indexed, column positions are 1-indexed

            if (Object.keys(this.arguments).length > 0) {
                switch (this.arguments.mode.toLowerCase()) {
                    case "line":
                        return resolve(`${line}`);
                    case "column":
                        return resolve(`${column}`);
                    default:
                        this.newErrorMessage("Unrecognised argument: "+this.arguments.mode);
                        return resolve(null);
                }
            } else {
                // default case when no args provided
                return resolve(`${line}:${column}`);
            }
        });
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

    public isAvailable(): boolean {
        return !!getEditor(this.app);
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when a note pane is open, not in graph view, nor when viewing non-text files.";
    }
}