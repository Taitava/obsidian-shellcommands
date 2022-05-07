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

import {FileVariable} from "./FileVariable";

export class Variable_Title extends FileVariable{
    public variable_name = "title";
    public help_text = "Gives the current file name without a file extension. If you need it with the extension, use {{file_name}} instead.";

    protected generateValue(): string {
        const active_file = this.getFile();
        if (active_file) {
            return active_file.basename;
        }
        return null;
    }
}