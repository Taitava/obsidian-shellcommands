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

import SC_Plugin from "../main";
import {SC_Event_onLayoutReady} from "./SC_Event_onLayoutReady";
import {SC_Event_onQuit} from "./SC_Event_onQuit";
import {SC_Event_onActiveLeafChanged} from "./SC_Event_onActiveLeafChanged";
import {SC_Event_EveryNSeconds} from "./SC_Event_EveryNSeconds";
import {SC_Event_FileMenu} from "./SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "./SC_Event_FolderMenu";
import {SC_Event_EditorMenu} from "./SC_Event_EditorMenu";
import {SC_Event} from "./SC_Event";

export function getSC_Events(plugin: SC_Plugin) {
    if (undefined === getSC_Events.events) {
        // Cache the list of SC_Event objects
        getSC_Events.events = [
            new SC_Event_onLayoutReady(plugin),
            new SC_Event_onQuit(plugin),
            new SC_Event_onActiveLeafChanged(plugin),
            new SC_Event_EveryNSeconds(plugin),
            new SC_Event_FileMenu(plugin),
            new SC_Event_FolderMenu(plugin),
            new SC_Event_EditorMenu(plugin),
        ];
    }
    return getSC_Events.events;
}
getSC_Events.events = undefined;

export function getSC_Event(plugin: SC_Plugin, sc_event_class: typeof SC_Event) {
    let found_sc_event: SC_Event = undefined;
    getSC_Events(plugin).forEach((sc_event: SC_Event) => {
        if (sc_event instanceof sc_event_class) {
            found_sc_event = sc_event;
        }
    });
    return found_sc_event;
}