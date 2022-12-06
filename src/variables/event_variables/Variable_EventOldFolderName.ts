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
import {extractFileName} from "../../Common";
import {SC_Event_FolderRenamed} from "../../events/SC_Event_FolderRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {Shell} from "../../shells/Shell";

export class Variable_EventOldFolderName extends EventVariable {
    public variable_name = "event_old_folder_name";
    public help_text = "File events: Gives the moved file's old parent folder's name. Folder events: Gives the renamed folder's old name.";

    protected supported_sc_events = [
        SC_Event_FileMoved,
        SC_Event_FolderRenamed,
    ];

    protected generateValue(
        shell: Shell,
        sc_event: SC_Event_FileMoved | SC_Event_FolderRenamed
    ): Promise<string | null> {
        return new Promise((resolve) => {
            if (!this.checkSC_EventSupport(sc_event)) {
                return resolve(null);
            }

            return resolve(extractFileName(sc_event.getFolderOldRelativePath()));
        });
    }
}