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

import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "../../events/SC_Event_FolderMenu";
import {EventVariable} from "./EventVariable";

export class Variable_EventFolderName extends EventVariable {
    public variable_name = "event_folder_name";
    public help_text = "File menu: Gives the selected file's parent folder name. Folder menu: Gives the selected folder's name. No ancestor folders are included.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FolderMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu | SC_Event_FolderMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        const folder = sc_event.getFolder();
        return folder.name;
    }
}