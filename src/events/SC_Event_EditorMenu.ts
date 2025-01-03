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
import {Editor, MarkdownView, Menu} from "obsidian";
import {SC_MenuEvent} from "./SC_MenuEvent";
import {EventType} from "./SC_Event";

export class SC_Event_EditorMenu extends SC_MenuEvent {
    protected static readonly event_code = "editor-menu";
    protected static readonly event_title = "Editor menu";
    protected readonly workspace_event = "editor-menu";

    protected getTrigger(t_shell_command: TShellCommand) {
        return async (menu: Menu, editor: Editor, view: MarkdownView) => {
            await this.addTShellCommandToMenu(t_shell_command, menu);
        };
    }

    public getType(): EventType {
        // TODO: Change all event_code properties to be the same as event types, and then make the parent method SC_Event.getType() return event_code. Then all sub-methods of getType() can be removed.
        return "editor-menu-item";
    }
}