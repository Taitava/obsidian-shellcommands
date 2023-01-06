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

import {EditorVariable} from "./EditorVariable";

export class Variable_CaretParagraph extends EditorVariable {
    public variable_name = "caret_paragraph";
    public help_text = "Gives a text line at the current caret position.";

    protected async generateValue(): Promise<string> {
        const editor = this.getEditorOrThrow();
        this.requireViewModeSource();

        const caretPosition = editor.getCursor('to');
        return editor.getLine(caretPosition.line);
    }

    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Not available in preview mode.";
    }
}