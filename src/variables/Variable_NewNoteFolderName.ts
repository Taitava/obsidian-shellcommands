/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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

export class Variable_NewNoteFolderName extends Variable {
    public variable_name = "new_note_folder_name";
    public help_text = "Gives the folder name for \"Default location for new notes\" (a setting in Obsidian). No ancestor folders are included.";

    protected async generateValue(): Promise<string> {
        const current_file = this.app.workspace.getActiveFile(); // Needed just in case new notes should be created in the same folder as the currently open file.
        const folder = this.app.fileManager.getNewFileParent(current_file ? current_file.path : ""); // If no file is open, use an empty string as instructed in .getNewFileParent()'s documentation.
        if (!folder) {
            this.throw("Cannot determine a folder name for new notes. Please create a discussion in GitHub."); // I guess this never happens.
        }

        // If the folder is the vault's root folder, return "." instead of " " (a space character). I don't know why the name is " " when the folder is root.
        return folder.isRoot()
            ? "."
            : folder.name
        ;
    }
}