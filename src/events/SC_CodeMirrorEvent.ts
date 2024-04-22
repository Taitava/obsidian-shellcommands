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

import {
    EventCategory,
    SC_Event,
} from "./SC_Event";
import {TShellCommand} from "../TShellCommand";
import {Extension} from "@codemirror/state";

export abstract class SC_CodeMirrorEvent extends SC_Event {
    
    /**
     * Contains a trigger callback for each TShellCommand that has this event enabled.
     *
     * @private
     */
    private registeredShellCommands: Map<string, TShellCommand> = new Map();
    
    /**
     * As multiple shell commands can enable an event, this property indicates whether a CodeMirror extension is already registered or not.
     * @private
     */
    private isCodeMirrorExtensionRegistered: boolean = false;
    
    protected _register(tShellCommand: TShellCommand): false {
        this.registeredShellCommands.set(tShellCommand.getId(), tShellCommand);
        if (!this.isCodeMirrorExtensionRegistered) {
            // Need to register the CodeMirror extension. Only need to do this once per event, not for every shell command using the same event.
            this.plugin.registerEditorExtension(this.getCodeMirrorExtension());
            this.isCodeMirrorExtensionRegistered = true;
        }
        return false; // No event reference.
    }

    protected _unregister(tShellCommand: TShellCommand): void {
        this.registeredShellCommands.delete(tShellCommand.getId());
        // No need to unregister the CodeMirror extension. It might be used by other shell commands, and even if it's not, leaving it registered causes no harm.
    }
    
    /**
     * Subclasses of SC_CodeMirrorEvent should call this when their event occurs.
     * @param condition Can be used to filter which shell commands should be executed and which not. If omitted, all shell
     * commands (that enable this event) will be executed.
     */
    protected triggerRegisteredShellCommands(condition?: (tShellCommand: TShellCommand) => boolean): void {
        for (const tShellCommand of this.registeredShellCommands.values()) {
            if (!condition || condition(tShellCommand)) {
                this.trigger(tShellCommand).then();
            }
        }
    }
    
    public getCategory(): EventCategory {
        return "editor";
    }
    
    /**
     * Each subclass of SC_CodeMirrorEvent should define their CodeMirror extension here. An extension takes care of triggering execution for all shell commands that have enabled the current event by calling this.triggerRegisteredShellCommands().
     *
     * Note that this method gets called once per *event*, not once per *shell command*. I.e. One CodeMirror extension should handle the event for all shell commands that have enabled the event.
     */
    public abstract getCodeMirrorExtension(): Extension;
}