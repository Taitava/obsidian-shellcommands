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

import {IParameters, Variable} from "./Variable";

export class Variable_Newline extends Variable {
    public variable_name = "newline";
    public help_text = "Gives a \\n character. Used for testing line break escaping. An optional argument can be used to tell how many newlines are needed.";

    public reset() {
        super.reset();
        this.arguments.count = 1;
    }

    protected static readonly parameters: IParameters = {
        count: {
            type: "integer",
            required: false,
        }
    };

    protected arguments: {
        count: number,
    };

    protected async generateValue(): Promise<string|null> {
        // Return \n, possible repeating it
        return "\n".repeat(this.arguments.count);
    }

    public getAvailabilityText() {
        return "<strong>Only available</strong> in debug mode.";
    }
}