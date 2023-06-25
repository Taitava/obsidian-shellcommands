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

import SC_Plugin from "../main";
import {SC_Event_onLayoutReady} from "./SC_Event_onLayoutReady";
import {SC_Event_onQuit} from "./SC_Event_onQuit";
import {SC_Event_onActiveLeafChanged} from "./SC_Event_onActiveLeafChanged";
import {SC_Event_EveryNSeconds} from "./SC_Event_EveryNSeconds";
import {SC_Event_FileMenu} from "./SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "./SC_Event_FolderMenu";
import {SC_Event_EditorMenu} from "./SC_Event_EditorMenu";
import {SC_Event_FileCreated} from "./SC_Event_FileCreated";
import {SC_Event_FileDeleted} from "./SC_Event_FileDeleted";
import {SC_Event_FileContentModified} from "./SC_Event_FileContentModified";
import {SC_Event_FileMoved} from "./SC_Event_FileMoved";
import {SC_Event_FileRenamed} from "./SC_Event_FileRenamed";
import {SC_Event_FolderCreated} from "./SC_Event_FolderCreated";
import {SC_Event_FolderDeleted} from "./SC_Event_FolderDeleted";
import {SC_Event_FolderMoved} from "./SC_Event_FolderMoved";
import {SC_Event_FolderRenamed} from "./SC_Event_FolderRenamed";
import {SC_Event} from "./SC_Event";
import {SC_Event_CaretMoved} from "./SC_Event_CaretMoved";

export function getSC_Events(plugin: SC_Plugin) {
    if (eventList.length === 0) {
        // Cache the list of SC_Event objects
        eventList.push(
            new SC_Event_onLayoutReady(plugin),
            new SC_Event_onQuit(plugin),
            new SC_Event_onActiveLeafChanged(plugin),
            new SC_Event_CaretMoved(plugin),
            new SC_Event_EveryNSeconds(plugin),
            new SC_Event_FileMenu(plugin),
            new SC_Event_FolderMenu(plugin),
            new SC_Event_EditorMenu(plugin),
            new SC_Event_FileContentModified(plugin),
            new SC_Event_FileCreated(plugin),
            new SC_Event_FileDeleted(plugin),
            new SC_Event_FileMoved(plugin),
            new SC_Event_FileRenamed(plugin),
            new SC_Event_FolderCreated(plugin),
            new SC_Event_FolderDeleted(plugin),
            new SC_Event_FolderMoved(plugin),
            new SC_Event_FolderRenamed(plugin),
        );
    }
    return eventList;
}
const eventList: SC_Event[] = [];

export function getSC_Event(plugin: SC_Plugin, sc_event_class: typeof SC_Event): SC_Event | undefined {
    let found_sc_event: SC_Event | undefined = undefined;
    getSC_Events(plugin).forEach((sc_event: SC_Event) => {
        if (sc_event instanceof sc_event_class) {
            found_sc_event = sc_event;
        }
    });
    return found_sc_event;
}