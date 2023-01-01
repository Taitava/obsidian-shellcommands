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

import {Escaper} from "./Escaper";

/**
 * Prefixes all characters that are not letters, numbers or underscores with a prefix character that can be defined by child classes.
 */
export abstract class AllSpecialCharactersEscaper extends Escaper {
    protected abstract prefix: string;

    public escape(): string {
        return this.raw_value.replace(/[^\w\d]/gu, (special_character: string) => {  // /g means to replace all occurrences instead of just the first one. /u means to handle four-byte unicode characters correctly as one character, not as two separate characters.
            // Do the replacing in a function in order to avoid a possible $ character to be interpreted by JavaScript to interact with the regex.
            // More information: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter (referenced 2021-11-02.
            return this.prefix + special_character;
        });
    }
}