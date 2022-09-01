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

import {AllSpecialCharactersEscaper} from "./AllSpecialCharactersEscaper";

export class ShEscaper extends AllSpecialCharactersEscaper {
    protected prefix = "\\"; // In *sh, escaping should use a backslash, e.g. "Hello, world!" becomes \"Hello\,\ world\!\"

    public escape(): string {
        return this.replace_newlines(super.escape());
    }

    /**
     * Converts escaped newline characters to a form that the Bourne family shells will interpret as literal newlines,
     * not as ignorable characters.
     *
     * @param escaped_value
     * @private
     */
    private replace_newlines(escaped_value: string): string {
        return escaped_value
            .replaceAll(this.prefix+"\r", this.prefix+this.prefix+"r") // Replace a real linefeed with a literal "\\r".
            .replaceAll(this.prefix+"\n", this.prefix+this.prefix+"n") // Replace a real newline with a literal "\\n".
        ;
    }
}