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

import {getEditor, getView} from "../Common";
import {Variable} from "./Variable";
import {debugLog} from "../Debug";

export class Variable_Selection extends Variable{
    public variable_name = "selection";
    public help_text = "Gives the currently selected text.";

    protected always_available = false;

    protected generateValue(): Promise<string|null> {

        return new Promise((resolve) => {
            // Check that we are able to get a view
            const view = getView(this.app);
            if (null === view) {
                // Nope.
                this.newErrorMessage("Could not get a view instance! Please raise an issue in GitHub.");
                return resolve(null);
            }

            // Check that we are able to get an editor
            const editor = getEditor(this.app);
            if (null === editor) {
                // Nope.
                this.newErrorMessage("Could not get an editor instance! Please raise an issue in GitHub.");
                return resolve(null);
            }

            // Check the view mode
            const view_mode = view.getMode(); // "preview" or "source" (can also be "live" but I don't know when that happens)
            switch (view_mode) {
                case "preview":
                    // The leaf is in preview mode, which makes things difficult.
                    // We could still return view.editor, but it does not work at least for getting selected text, maybe for other things, but currently this function is only used for getting selected text.
                    // At this moment, just return null to indicate that we were not able to offer an editor instance which could work reliably on text selections.
                    // FIXME: Make it possible to use this feature also in preview mode.
                    debugLog("ShellCommandVariable_Selection: 'view' is in preview mode, and the poor guy who wrote this code, does not know how to return an editor instance that could be used for getting text selection.");
                    this.newErrorMessage("You need to turn editing mode on, as I'm not able to get selected text when in preview mode. Blame the one who developed this plugin! This should be fixed in the future.");
                    return resolve(null);
                case "source":
                    // Good, the editor is in "source" mode, so it's possible to get a selection.
                    if (editor.somethingSelected()) {
                        return resolve(editor.getSelection());
                    }
                    return resolve("");
                default:
                    throw new Error("ShellCommandVariable_Selection: Unrecognised view mode: " + view_mode);
            }
        });
    }

    public isAvailable(): boolean {
        const view = getView(this.app);
        return view && getEditor(this.app) && view.getMode() === "source";
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in <em>Editing</em>/<em>Live preview</em> mode, <strong>not</strong> in <em>Reading</em> mode.";
    }
}