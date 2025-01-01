/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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

import {TShellCommand} from "../TShellCommand";
import {Menu, TAbstractFile, TFile, TFolder, WorkspaceLeaf} from "obsidian";
import {SC_MenuEvent} from "./SC_MenuEvent";
import {EventType} from "./SC_Event";

export abstract class SC_AbstractFileMenuEvent extends SC_MenuEvent {
    protected abstract file_or_folder: "file" | "folder";
    protected readonly workspace_event = "file-menu";
    protected file: TFile;
    protected folder: TFolder;

    protected getTrigger(t_shell_command: TShellCommand) {
        return async (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
            // Check that it's the correct menu: if the SC_Event requires a file menu, 'file' needs to be a TFile, otherwise it needs to be a TFolder.
            if ((this.file_or_folder === "folder" && file instanceof TFolder) || (this.file_or_folder === "file" && file instanceof TFile)) {
                // The menu is correct.

                // File/folder for declareExtraVariables()
                switch (this.file_or_folder) {
                    case "file":
                        this.file = file as TFile;
                        break;
                    case "folder":
                        this.folder = file as TFolder;
                        break;
                }

                await this.addTShellCommandToMenu(t_shell_command, menu);
            }
        };
    }
    
    public getType(): EventType {
        // TODO: Change all event_code properties to be the same as event types, and then make the parent method SC_Event.getType() return event_code. Then all sub-methods of getType() can be removed.
        return this.file_or_folder + "-menu-item" as "file-menu-item" | "folder-menu-item";
    }
}
