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

import {IParameters} from "./Variable";
import {FileVariable} from "./FileVariable";
import {getFileTags} from "./VariableHelpers";

export class Variable_Tags extends FileVariable {
    public variable_name = "tags";
    public help_text = "Gives all tags defined in the current note. Replace the \"separator\" part with a comma, space or whatever characters you want to use as a separator between tags. A separator is always needed to be defined.";

    protected static readonly parameters: IParameters = {
        separator: {
            type: "string",
            required: true,
        }
    };

    protected async generateValue(castedArguments: {separator: string}): Promise<string> {
        return getFileTags(this.app, this.getFileOrThrow()).join(castedArguments.separator);
    }
}