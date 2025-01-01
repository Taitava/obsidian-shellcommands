/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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
import {normalizePath} from "obsidian";

export class Variable_FileURI extends FileVariable{
    public variable_name = "file_uri";
    public help_text = "Gives an Obsidian URI that opens the current file.";

    protected async generateValue(): Promise<string> {
        return this.plugin.getObsidianURI("open", {
            file: normalizePath(this.getFileOrThrow().path), // Use normalizePath() instead of normalizePath2() because / should not be converted to \ on Windows because this is used as a URI, not as a file system path.
        });
    }
}