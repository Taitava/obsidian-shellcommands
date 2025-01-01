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

import {IParameters, Variable} from "./Variable";
import {Shell} from "../shells/Shell";

export class Variable_Newline extends Variable {
    public variable_name = "newline";
    public help_text = "Gives a \\n character. Used for testing line break escaping. An optional argument can be used to tell how many newlines are needed.";

    protected static readonly parameters: IParameters = {
        count: {
            type: "integer",
            required: false,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {count?: number},
    ): Promise<string> {
        // Return \n, possibly repeating it
        return "\n".repeat(castedArguments.count ?? 1);
    }

    public getAvailabilityText() {
        return "<strong>Only available</strong> in debug mode.";
    }
}