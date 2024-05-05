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

export abstract class SC_CodeMirrorEvent extends SC_Event {
    protected abstract readonly codeMirrorEvent: Parameters<CodeMirror.Editor["on"]>[0];
    
    /**
     * Contains a trigger callback for each TShellCommand that has this event enabled.
     *
     * @private
     */
    private tShellCommandTriggers: Map<string, () => void> = new Map();
    
    protected _register(tShellCommand: TShellCommand): false {
        const trigger = () => this.trigger(tShellCommand);
        this.tShellCommandTriggers.set(tShellCommand.getId(), trigger);
    
        // Register the trigger for all current CodeMirror instances created by Obsidian.
        this.app.workspace.iterateCodeMirrors((codeMirror: CodeMirror.Editor) => {
            codeMirror.on(this.codeMirrorEvent, trigger);
        });
        
        return false; // No event reference.
    }

    protected _unregister(tShellCommand: TShellCommand): void {
        // Unregister the trigger for all current CodeMirror instances created by Obsidian.
        this.app.workspace.iterateCodeMirrors((codeMirror: CodeMirror.Editor) => {
            const trigger: (() => void) | undefined = this.tShellCommandTriggers.get(tShellCommand.getId());
            if (undefined !== trigger) {
                codeMirror.off(this.codeMirrorEvent, trigger);
            }
        });
    }
    
    public getCategory(): EventCategory {
        return "editor";
    }
}