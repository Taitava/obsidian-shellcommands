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

import {moment} from "obsidian";
import {IParameters, Variable} from "./Variable";

export class Variable_Date extends Variable {
    public variable_name = "date";
    public help_text = "Gives a date/time stamp as per your liking. The \"format\" part can be customized and is mandatory. Formatting options: https://momentjs.com/docs/#/displaying/format/";

    protected static readonly parameters: IParameters = {
        format: {
            type: "string",
            required: true,
        },
    }

    protected generateValue(castedArguments: {format: string}): Promise<string|null> {
        return Promise.resolve(moment().format(castedArguments.format));
    }
}