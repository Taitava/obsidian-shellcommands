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

export class Variable_EventFileName extends EventVariable {
    public variable_name = "event_file_name";
    public help_text = "Gives the selected file name with a file extension. If you need it without the extension, use {{event_title}} instead.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        return sc_event.getFile().name;
    }
}