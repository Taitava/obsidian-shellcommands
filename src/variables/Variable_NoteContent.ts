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

import {FileVariable} from "./FileVariable";
import {getFileContentWithoutYAML} from "../Common";

export class Variable_NoteContent extends FileVariable {
    public variable_name = "note_content";
    public help_text = "Gives the current note's content without YAML frontmatter. If you need YAML included, use {{file_content}} instead.";

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const active_file = this.getFile();
            if (!active_file) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            getFileContentWithoutYAML(this.app, active_file).then((file_content_without_yaml: string) => {
                resolve(file_content_without_yaml);
            });
        });
    }
}