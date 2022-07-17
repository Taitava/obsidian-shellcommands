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

import {SC_Event} from "./SC_Event";
import {TShellCommand} from "../TShellCommand";
import {EventRef} from "obsidian";

export abstract class SC_WorkspaceEvent extends SC_Event {
    protected abstract readonly workspace_event:
        // TODO: Find a way to make this list dynamic.
        // This list reflects Obsidian API version 0.12.11.
        | 'quick-preview'
        | 'resize'
        | 'click'
        | 'active-leaf-change'
        | 'file-open'
        | 'layout-change'
        | 'css-change'
        | 'file-menu'
        | 'editor-menu'
        | 'codemirror'
        | 'quit'
    ;

    protected _register(t_shell_command: TShellCommand) {
        // @ts-ignore TODO: Find a way to get a dynamic type for this.workspace_event .
        return this.app.workspace.on(this.workspace_event, this.getTrigger(t_shell_command));
    }

    protected _unregister(event_reference: EventRef): void {
        this.app.workspace.offref(event_reference);
    }

    protected getTrigger(t_shell_command: TShellCommand) {
        return (...parameters: unknown[] /* Need to have this ugly parameter thing so that subclasses can define their own parameters. */) => this.trigger(t_shell_command);
    }
}