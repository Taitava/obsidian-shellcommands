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
import {FolderVariable} from "./FolderVariable";
import {getFolderPath} from "./VariableHelpers";

export class Variable_FolderPath extends FolderVariable {
    public variable_name = "folder_path";
    public help_text = "Gives path to the current file's parent folder, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        }
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const folder = this.getFolder();
            if (folder) {
                return resolve(getFolderPath(this.app, folder, this.arguments.mode));
            } else {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }
        });
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file's parent folder, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file's parent folder, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the current file's parent folder, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the current file's parent folder, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{folder_path:relative}}</strong> or <strong>{{folder_path:absolute}}</strong>";
    }
}