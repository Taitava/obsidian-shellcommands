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

import {FileVariable} from "./FileVariable";
import {
    TFile,
    TFolder,
} from "obsidian";

export abstract class FolderVariable extends FileVariable {

    protected getFolderOrThrow(): TFolder | never {
        // Get current file's parent folder.
        const file: TFile = this.getFileOrThrow();
        const currentFolder: TFolder | null = file.parent;
        if (!currentFolder) {
            // No parent folder.
            this.throw("The current file does not have a parent for some strange reason.");
        }
        return currentFolder;
    }

}