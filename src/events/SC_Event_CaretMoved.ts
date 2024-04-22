/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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

import {SC_CodeMirrorEvent} from "./SC_CodeMirrorEvent";
import {Setting} from "obsidian";
import {EventType} from "./SC_Event";
import {Extension} from "@codemirror/state";
import {EditorView} from "@codemirror/view";

export class SC_Event_CaretMoved extends SC_CodeMirrorEvent {
    protected static readonly event_code = "caret-moved";
    protected static readonly event_title = "Caret moved in editor";
    
    public getCodeMirrorExtension(): Extension {
        return EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
                // Selection/caret position has changed.
                // TODO: Implement mode setting: `line` only triggers for line changes, `column` only triggers for column changes, `all` triggers for both. This requires triggerRegisteredShellCommands() to be changed so that it can be passed a Map of triggerable shell commands.
                if (!update.state.selection.eq(update.startState.selection)) { // Prevent double triggering when clicking with mouse. This discards mouse button RELEASE.
                    this.triggerRegisteredShellCommands();
                }
            }
        });
    }
    
    public createExtraSettingsFields(extraSettingsContainer: HTMLDivElement) {
        // new Setting(extraSettingsContainer)
        // ;
    }
    
    public getType(): EventType {
        // TODO: Change all event_code properties to be the same as event types, and then make the parent method SC_Event.getType() return event_code. Then all sub-methods of getType() can be removed.
        return "caret-moved";
    }
}