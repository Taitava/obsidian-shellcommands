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

import {OutputChannelDriver_CurrentFile} from "./OutputChannelDriver_CurrentFile";
import {Editor} from "obsidian";

export class OutputChannelDriver_CurrentFileTop extends OutputChannelDriver_CurrentFile {
    protected readonly title = "Current file: top";

    public hotkey_letter = "T";

    /**
     * Inserts text into the given editor, at top.
     *
     * @param editor
     * @param output_message
     * @protected
     */
    protected insertIntoEditor(editor: Editor, output_message: string): void {
        const top_position = editor.offsetToPos(0);
        editor.replaceRange(output_message, top_position);
    }
}