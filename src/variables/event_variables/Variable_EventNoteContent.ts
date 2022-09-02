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
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FileCreated} from "../../events/SC_Event_FileCreated";
import {SC_Event_FileContentModified} from "../../events/SC_Event_FileContentModified";
import {SC_Event_FileDeleted} from "../../events/SC_Event_FileDeleted";
import {SC_Event_FileRenamed} from "../../events/SC_Event_FileRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {getFileContentWithoutYAML} from "../../Common";

export class Variable_EventNoteContent extends EventVariable {
    public variable_name = "event_note_content";
    public help_text = "Gives the event related file's content without YAML frontmatter. If you need YAML included, use {{event_file_content}} instead.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FileCreated,
        SC_Event_FileContentModified,
        SC_Event_FileDeleted,
        SC_Event_FileMoved,
        SC_Event_FileRenamed,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu | SC_Event_FileCreated | SC_Event_FileContentModified | SC_Event_FileDeleted | SC_Event_FileMoved | SC_Event_FileRenamed): Promise<string | null> {
        return new Promise((resolve) => {
            if (!this.checkSC_EventSupport(sc_event)) {
                return resolve(null);
            }

            getFileContentWithoutYAML(this.app, sc_event.getFile()).then((file_content: string) => {
                return resolve(file_content);
            });
        });
    }

}