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

import {OutputChannel_CurrentFile} from "./OutputChannel_CurrentFile";
import {Editor, EditorPosition} from "obsidian";

export class OutputChannel_CurrentFileBottom extends OutputChannel_CurrentFile {
    protected static readonly title = "Current file: bottom";

    public static readonly hotkey_letter = "B";

    /**
     * Inserts text into the given editor, at bottom.
     *
     * @param editor
     * @param output_message
     * @protected
     */
    protected insertIntoEditor(editor: Editor, output_message: string): void {
        const bottom_position: EditorPosition = {
            ch: editor.getLine(editor.lastLine()).length,   // The last character* of ...
            line: editor.lastLine(),                        // ... the last line.
        };                                                  // *) But do not subtract 1, because ch is zero-based, so when .length is used without -1, we are pointing AFTER the last character.
        editor.replaceRange(output_message, bottom_position);
    }
}