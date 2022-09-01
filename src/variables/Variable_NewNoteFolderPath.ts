/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {
    IParameters,
    Variable,
} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {getFolderPath} from "./VariableHelpers";

export class Variable_NewNoteFolderPath extends Variable {
    public variable_name = "new_note_folder_path";
    public help_text = "Gives path to the \"Default location for new notes\" folder (a setting in Obsidian), either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        }
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    protected generateValue(): string|null {
        const current_file = this.app.workspace.getActiveFile(); // Needed just in case new notes should be created in the same folder as the currently open file.
        const folder = this.app.fileManager.getNewFileParent(current_file ? current_file.path : ""); // If no file is open, use an empty string as instructed in .getNewFileParent()'s documentation.
        if (folder) {
            return getFolderPath(this.app, folder, this.arguments.mode);
        } else {
            this.newErrorMessage("Cannot determine a folder path for new notes. Please create a discussion in GitHub."); // I guess this never happens.
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the \"Default location for new notes\" folder (a setting in Obsidian), absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives path to the \"Default location for new notes\" folder (a setting in Obsidian), relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives path to the \"Default location for new notes\" folder (a setting in Obsidian), absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives path to the \"Default location for new notes\" folder (a setting in Obsidian), relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{folder_path:relative}}</strong> or <strong>{{folder_path:absolute}}</strong>";
    }
}