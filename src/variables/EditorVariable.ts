/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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
} from "../common/commonObsidian";
import {
    Editor,
    MarkdownView,
} from "obsidian";
import {debugLog} from "../Debug";

export abstract class EditorVariable extends Variable {

    protected always_available = false;

    protected getEditorOrThrow(): Editor | never {
        const editor = getEditor(this.app);
        if (null === editor) {
            // No editor.
            this.throw("Could not get an editor instance! Please create a discussion in GitHub.");
        }
        return editor;
    }

    /**
     * Can be made protected if needed to be accessed by subclasses.
     * @private
     */
    private getViewOrThrow(): MarkdownView {
        const view = getView(this.app);
        if (null === view) {
            // No view.
            this.throw("Could not get a view instance! Please create a discussion in GitHub.");
        }
        return view;
    }

    protected requireViewModeSource(): void {
        const view: MarkdownView = this.getViewOrThrow();
        const view_mode = view.getMode(); // "preview" or "source" ("live" was removed from Obsidian API in 0.13.8 on 2021-12-10).

        switch (view_mode) {
            case "preview":
                // The leaf is in preview mode, which makes things difficult.
                // FIXME: Make it possible to use this feature also in preview mode.
                debugLog("EditorVariable: 'view' is in preview mode, and the poor guy who wrote this code, does not know how to return an editor instance that could be used for getting text selection.");
                this.throw("You need to turn editing mode on, unfortunately this variable does not work in preview mode.");
                break;
            case "source":
                // Good, the editor is in "source" mode, so it's possible to get a selection, caret position or other editing related information.
                return;
            default:
                this.throw("Unrecognised view mode: " + view_mode);
                break;
        }
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when a note pane is open, not in graph view, nor when viewing non-text files.";
    }
}