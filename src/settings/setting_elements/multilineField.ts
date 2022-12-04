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

import SC_Plugin from "../../main";
import {TextAreaComponent} from "obsidian";

/**
 * Makes a textarea grow and shrink based on the content height, and applies CSS styles on it to make it look more like an <input> element (not so much padding).
 */
export function decorateMultilineField(plugin: SC_Plugin, textareaComponent: TextAreaComponent, extraOnChange?: (content: string) => void) {

    const textareaElement = textareaComponent.inputEl;

    textareaElement.addClass("SC-multiline");

    const updateTextareaHeight = () => {
        // Resize the shell command textarea to match the amount of lines in it.
        const content = textareaElement.value;
        const placeholder = textareaElement.placeholder;
        const newlines_pattern = /\r\n|\r|\n/;
        const count_lines_in_shell_command = content.split(newlines_pattern).length;
        const count_lines_in_shell_command_placeholder = placeholder.split(newlines_pattern).length;
        let count_lines_final = Math.max(
            count_lines_in_shell_command,
            count_lines_in_shell_command_placeholder,
        );
        if (plugin.settings.max_visible_lines_in_shell_command_fields) {
            // Limit the height so that the field will not take up too much space.
            count_lines_final = Math.min(
                plugin.settings.max_visible_lines_in_shell_command_fields,
                count_lines_final,
            );
        }
        textareaElement.rows = count_lines_final;
    };

    updateTextareaHeight(); // Set a correct initial height.
    textareaComponent.onChange(() => {
        updateTextareaHeight(); // Update the height every time the field's value changes.
        if (extraOnChange) {
            extraOnChange(textareaElement.value);
        }
    });
}

