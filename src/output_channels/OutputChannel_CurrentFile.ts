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

import {OutputChannel} from "./OutputChannel";
import {getEditor, getView} from "../Common";
import {Editor} from "obsidian";
import {debugLog} from "../Debug";

export abstract class OutputChannel_CurrentFile extends OutputChannel {

    /**
     * There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, they
     * will be joined together with " " as a separator.
     * @protected
     */
    protected static readonly combine_output_streams = " ";

    protected async _handleBuffered(outputContent: string): Promise<void> {
        this.handle(outputContent);
    }

    protected async _handleRealtime(outputContent: string): Promise<void> {
        this.handle(outputContent);
    }

    private handle(output_message: string) {
        const editor = getEditor(this.app);
        const view = getView(this.app);

        if (null === editor) {
            // For some reason it's not possible to get an editor.
            this.plugin.newError("Could not get an editor instance! Please create a discussion in GitHub. The command output is in the next error box:");
            this.plugin.newError(output_message); // Good to output it at least some way.
            debugLog("OutputChannel_CurrentFile: Could not get an editor instance.");
            return;
        }

        // Check if the view is in source mode
        if (null === view) {
            // For some reason it's not possible to get an editor, but it's not a big problem.
            debugLog("OutputChannel_CurrentFile: Could not get a view instance.");
        } else {
            // We do have a view
            if ("source" !== view.getMode()) {
                // Warn that the output might go to an unexpected place in the note file.
                this.plugin.newNotification("Note that your active note is not in 'Edit' mode! The output comes visible when you switch to 'Edit' mode again!");
            }
        }

        // Insert into the current file
        this.insertIntoEditor(editor, output_message);
    }

    protected abstract insertIntoEditor(editor: Editor, output_message: string): void;
}