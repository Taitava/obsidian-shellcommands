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

import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "../../events/SC_Event_FolderMenu";
import {SC_Event_FileCreated} from "../../events/SC_Event_FileCreated";
import {SC_Event_FolderCreated} from "../../events/SC_Event_FolderCreated";
import {SC_Event_FileContentModified} from "../../events/SC_Event_FileContentModified";
import {SC_Event_FileDeleted} from "../../events/SC_Event_FileDeleted";
import {SC_Event_FolderDeleted} from "../../events/SC_Event_FolderDeleted";
import {SC_Event_FileRenamed} from "../../events/SC_Event_FileRenamed";
import {SC_Event_FolderRenamed} from "../../events/SC_Event_FolderRenamed";
import {SC_Event_FolderMoved} from "../../events/SC_Event_FolderMoved";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {EventVariable} from "./EventVariable";

export class Variable_EventFolderName extends EventVariable {
    public variable_name = "event_folder_name";
    public help_text = "File events: Gives the event related file's parent folder name. Folder events: Gives the selected folder's name. Gives a dot if the folder is the vault's root. No ancestor folders are included.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FolderMenu,
        SC_Event_FileCreated,
        SC_Event_FileContentModified,
        SC_Event_FileDeleted,
        SC_Event_FileMoved,
        SC_Event_FileRenamed,
        SC_Event_FolderCreated,
        SC_Event_FolderDeleted,
        SC_Event_FolderMoved,
        SC_Event_FolderRenamed,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu | SC_Event_FolderMenu | SC_Event_FileCreated | SC_Event_FileContentModified | SC_Event_FileDeleted | SC_Event_FileMoved | SC_Event_FileRenamed | SC_Event_FolderCreated | SC_Event_FolderDeleted | SC_Event_FolderMoved | SC_Event_FolderRenamed): Promise<string | null> {
        return new Promise((resolve) => {
            if (!this.checkSC_EventSupport(sc_event)) {
                return resolve(null);
            }

            const folder = sc_event.getFolder();
            return resolve(
                folder.isRoot()
                    ? "." // Return a dot instead of an empty string.
                    : folder.name
            );
        });
    }
}