/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {getFileExtension} from "./VariableHelpers";
import {FileVariable} from "./FileVariable";

export class Variable_FileExtension extends FileVariable {
    public variable_name = "file_extension";
    public help_text = "Gives the current file name's ending. Use {{file_extension:with-dot}} to include a preceding dot. If the extension is empty, no dot is added. {{file_extension:no-dot}} never includes a dot.";

    protected static parameters: IParameters = {
        "dot": {
            options: ["with-dot", "no-dot"],
            required: true,
        },
    };

    protected async generateValue(castedArguments: {"dot": "with-dot" | "no-dot"}): Promise<string> {
        return getFileExtension(this.getFileOrThrow(), castedArguments.dot === "with-dot");
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dot}}",
                help_text: "Gives the current file name's ending without a preceding dot. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dot}}",
                help_text: "Gives the current file name's ending with a preceding dot. If the extension is empty, no dot is included. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dot}}",
                help_text: "Gives the current file name's ending without a preceding dot. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dot}}",
                help_text: "Gives the current file name's ending with a preceding dot. If the extension is empty, no dot is included. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{file_extension:with-dot}}</strong> or <strong>{{file_extension:no-dot}}</strong>";
    }
}