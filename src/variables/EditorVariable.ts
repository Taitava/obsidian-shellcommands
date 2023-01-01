/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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

import {Variable} from "./Variable";
import {
    getEditor,
    getView,
} from "../Common";
import {
    Editor,
    MarkdownView,
} from "obsidian";
import {debugLog} from "../Debug";

export abstract class EditorVariable extends Variable {

    protected editor: Editor | null;
    protected view: MarkdownView | null;

    protected always_available = false;

    protected requireEditor() {
        this.editor = getEditor(this.app);
        if (null === this.editor) {
            // No editor.
            this.newErrorMessage("Could not get an editor instance! Please create a discussion in GitHub.");
            return false;
        }
        return true;
    }

    /**
     * Can be made protected if needed to be accessed by subclasses.
     * @private
     */
    private requireView() {
        this.view = getView(this.app);
        if (null === this.view) {
            // No view.
            this.newErrorMessage("Could not get a view instance! Please create a discussion in GitHub.");
            return false
        }
        return true;
    }

    protected isViewModeSource() {
        if (!this.requireView()) {
            return false;
        }

        const view: MarkdownView = this.view as MarkdownView; // as MarkdownView: Make TypeScript understand that view is always defined at this point.
        const view_mode = view.getMode(); // "preview" or "source" ("live" was removed from Obsidian API in 0.13.8 on 2021-12-10).

        switch (view_mode) {
            case "preview":
                // The leaf is in preview mode, which makes things difficult.
                // FIXME: Make it possible to use this feature also in preview mode.
                debugLog("EditorVariable: 'view' is in preview mode, and the poor guy who wrote this code, does not know how to return an editor instance that could be used for getting text selection.");
                this.newErrorMessage("You need to turn editing mode on, unfortunately this variable does not work in preview mode.");
                return false;
            case "source":
                // Good, the editor is in "source" mode, so it's possible to get a selection.
                return true;
            default:
                throw new Error("EditorVariable: Unrecognised view mode: " + view_mode);
        }
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when a note pane is open, not in graph view, nor when viewing non-text files.";
    }
}