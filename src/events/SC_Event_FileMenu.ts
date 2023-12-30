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

import {SC_AbstractFileMenuEvent} from "./SC_AbstractFileMenuEvent";
import {TFile, TFolder} from "obsidian";

export class SC_Event_FileMenu extends SC_AbstractFileMenuEvent {
    protected static readonly event_code = "file-menu";
    protected static readonly event_title = "File menu";
    protected file_or_folder: "file" = "file";

    public getFile(): TFile {
        return this.file;
    }

    public getFolder(): TFolder {
        if (!this.file.parent) {
            throw new Error("The event file does not have a parent for some strange reason.");
        }
        return this.file.parent;
    }
}