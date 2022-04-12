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

import {FolderVariable} from "./FolderVariable";

export class Variable_FolderName extends FolderVariable {
    public variable_name = "folder_name";
    public help_text = "Gives the current file's parent folder name. No ancestor folders are included.";

    protected generateValue(): string {
        const folder = this.getFolder();
        if (!folder) {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return folder.name;
    }
}