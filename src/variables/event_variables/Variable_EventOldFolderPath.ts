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

import {EventVariable} from "./EventVariable";
import {
    getVaultAbsolutePath,
    normalizePath2,
} from "../../Common";
import {IParameters} from "../Variable";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";
import {SC_Event_FolderRenamed} from "../../events/SC_Event_FolderRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {SC_Event_FolderMoved} from "../../events/SC_Event_FolderMoved";

export class Variable_EventOldFolderPath extends EventVariable {
    public variable_name = "event_old_folder_path";
    public help_text = "File events: Gives the moved file's old parent folder's path. Folder events: Gives the renamed/moved folder's old path. The path is either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected arguments: {
        mode: "absolute" | "relative";
    }

    protected supported_sc_events = [
        SC_Event_FileMoved,
        SC_Event_FolderMoved,
        SC_Event_FolderRenamed,
    ];

    protected generateValue(sc_event: SC_Event_FileMoved | SC_Event_FolderRenamed | SC_Event_FolderMoved): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        const folder_old_relative_path = sc_event.getFolderOldRelativePath();
        switch (this.arguments.mode.toLowerCase()) {
            case "relative":
                return normalizePath2(folder_old_relative_path);
            case "absolute":
                return normalizePath2(getVaultAbsolutePath(this.app) + "/" + folder_old_relative_path);
        }

        this.newErrorMessage("Unrecognized mode parameter: " + this.arguments.mode);
        return null;
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":absolute}}",
                help_text: "File events: Gives the moved file's old parent folder's path. Folder events: Gives the renamed/moved folder's old path. The path is absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":relative}}",
                help_text: "File events: Gives the moved file's old parent folder's path. Folder events: Gives the renamed/moved folder's old path. The path is relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":absolute}}",
                help_text: "File events: Gives the moved file's old parent folder's path. Folder events: Gives the renamed/moved folder's old path. The path is absolute from the root of the file system. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":relative}}",
                help_text: "File events: Gives the moved file's old parent folder's path. Folder events: Gives the renamed/moved folder's old path. The path is relative from the root of the Obsidian vault. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_file_path:relative}}</strong> or <strong>{{event_file_path:absolute}}</strong>";
    }
}