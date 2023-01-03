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

import {EventVariable} from "./EventVariable";
import {
    getVaultAbsolutePath,
    normalizePath2,
} from "../../Common";
import {IParameters} from "../Variable";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";
import {SC_Event_FileRenamed} from "../../events/SC_Event_FileRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";

export class Variable_EventOldFilePath extends EventVariable {
    public variable_name = "event_old_file_path";
    public help_text = "Gives the renamed/moved file's old path, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected supported_sc_events = [
        SC_Event_FileMoved,
        SC_Event_FileRenamed,
    ];

    protected generateValue(
        castedArguments: {mode: "absolute" | "relative"},
        sc_event: SC_Event_FileMoved | SC_Event_FileRenamed,
    ): Promise<string | null> {
        return new Promise((resolve) => {
            if (!this.checkSC_EventSupport(sc_event)) {
                return resolve(null);
            }

            const file_old_relative_path = sc_event.getFileOldRelativePath();
            switch (castedArguments.mode.toLowerCase()) {
                case "relative":
                    return resolve(normalizePath2(file_old_relative_path));
                case "absolute":
                    return resolve(normalizePath2(getVaultAbsolutePath(this.app) + "/" + file_old_relative_path));
            }

            this.newErrorMessage("Unrecognized mode parameter: " + castedArguments.mode);
            return resolve(null);
        });
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "Gives the renamed/moved file's old path, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "Gives the renamed/moved file's old path, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "Gives the renamed/moved file's old path, absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "Gives the renamed/moved file's old path, relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_file_path:relative}}</strong> or <strong>{{event_file_path:absolute}}</strong>";
    }
}