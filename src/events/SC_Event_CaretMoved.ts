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
import {SC_EventConfiguration} from "./SC_EventConfiguration";
import {TShellCommand} from "../TShellCommand";
import {getCodeMirrorLineAndColumnNumbers} from "../Common";

export class SC_Event_CaretMoved extends SC_CodeMirrorEvent {
    protected static readonly event_code = "caret-moved";
    protected static readonly event_title = "Caret moved in editor";
    protected default_configuration: Configuration = {
        enabled: false,
        lineOrColumn: "any",
    };
    
    public getCodeMirrorExtension(): Extension {
        return EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
                // Selection/caret position has changed.
                
                if (!update.state.selection.eq(update.startState.selection)) { // Prevent double triggering when clicking with mouse. This discards mouse button RELEASE.
                    
                    // What has changed: line, column, or both?
                    const lineAndColumnNumbers = getCodeMirrorLineAndColumnNumbers(update);
                    const lineChanged = lineAndColumnNumbers.old.line !== lineAndColumnNumbers.new.line;
                    const columnChanged = lineAndColumnNumbers.old.column !== lineAndColumnNumbers.new.column;
                    
                    // Execute shell commands - but with filtering.
                    this.triggerRegisteredShellCommands((tShellCommand: TShellCommand): boolean => {
                        // Check which kind of change the shell command requires.
                        const lineOrColumn: LineOrColumn = this.getConfiguration(tShellCommand).lineOrColumn;
                        switch (lineOrColumn) {
                            case "any":
                                return columnChanged || lineChanged;
                            case "column":
                                return columnChanged;
                            case "line":
                                return lineChanged;
                            default:
                                // There might be some < 0.22.0 configurations out there that does have `caret-moved` event enabled (even though the event does not work before version 0.22.0), but have no `lineOrColumn` property defined.
                                // TODO: Create a migration in Migrations.ts that adds the lineOrColumn property to possibly existing caret moved event configurations. The migration could be generalised in a way that it could insert properties to any events that might be missing properties.
                                return columnChanged || lineChanged;
                        }
                    });
                }
            }
        });
    }
    
    public createExtraSettingsFields(extraSettingsContainer: HTMLDivElement, tShellCommand: TShellCommand) {
        // Line or column mode.
        new Setting(extraSettingsContainer)
            .setName("React to line or column changes")
            .addDropdown(lineOrColumnDropdown => lineOrColumnDropdown
                .addOptions({
                    any: "Any changes",
                    line: "Line changes only",
                    column: "Column changes only",
                })
                .setValue(this.getConfiguration(tShellCommand).lineOrColumn)
                .onChange(async (newMode: Configuration["lineOrColumn"]) => {
                    this.getConfiguration(tShellCommand).lineOrColumn = newMode;
                    await this.plugin.saveSettings();
                })
            )
        ;
    }
    
    /**
     * Overridden only to change the return type.
     * @param tShellCommand
     * @protected
     */
    protected getConfiguration(tShellCommand: TShellCommand): Configuration {
        return super.getConfiguration(tShellCommand) as Configuration;
    }
    
    public getType(): EventType {
        // TODO: Change all event_code properties to be the same as event types, and then make the parent method SC_Event.getType() return event_code. Then all sub-methods of getType() can be removed.
        return "caret-moved";
    }
}

type LineOrColumn = "any" | "line" | "column";

interface Configuration extends SC_EventConfiguration {
    lineOrColumn: LineOrColumn,
}