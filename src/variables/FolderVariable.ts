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

export abstract class FolderVariable extends FileVariable {

    protected getFolder() {
        // Get current file's parent folder.
        const file = this.getFile();
        if (!file) {
            return null;
        }
        const current_folder = file.parent;
        if (!current_folder) {
            // No parent folder.
            this.newErrorMessage("The current file does not have a parent for some strange reason.")
            return null;
        }
        return current_folder;
    }

    public async isAvailable(): Promise<boolean> {
        // Normal check: ensure a file pane is open and focused.
        if (!await super.isAvailable()) {
            return false;
        }

        // Check that a parent folder is available. (If not, it's strange.)
        return !!this.getFile()?.parent;
    }
}