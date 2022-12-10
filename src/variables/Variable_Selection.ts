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

import {getView} from "../Common";
import {EditorVariable} from "./EditorVariable";
import {Editor} from "obsidian";
import {EOL} from "os";

export class Variable_Selection extends EditorVariable {
    public variable_name = "selection";
    public help_text = "Gives the currently selected text.";

    protected always_available = false;

    protected async generateValue(): Promise<string|null> {

        // Check that we are able to get an editor
        if (!this.requireEditor() || !this.editor) { //  || !this.editor is only for making TypeScript compiler understand that this.editor exists later.
            // Nope.
            return null;
        }

        // Check the view mode
        if (this.isViewModeSource()) {
            // Good, the editor is in "source" mode, so it's possible to get a selection.
            if (this.editor.somethingSelected()) {
                return this.editor.getSelection();
            }
            this.newErrorMessage("Nothing is selected. "+EOL+EOL+"(This error message was added in SC 0.18.0. Earlier the variable gave an empty text in this situation. If you want to restore the old behavior, go to SC settings, then to Variables tab, and define a default value for {{selection}}.)");
            return null;
        }
        return null;
    }

    public isAvailable(): boolean {
        const view = getView(this.app);
        const hasViewAndEditor: boolean = !!view && this.requireEditor() && view.getMode() === "source";
        return hasViewAndEditor && (this.editor as Editor).somethingSelected();
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when something is selected in <em>Editing</em>/<em>Live preview</em> mode, <strong>not</strong> in <em>Reading</em> mode.";
    }
}