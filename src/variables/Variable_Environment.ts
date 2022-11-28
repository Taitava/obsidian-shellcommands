/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022:
 *  - Vinay Rajur (created most of the content of the Variable_CaretPosition class)
 *  - Jarkko Linnanvirta (some minor/structural changes)
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
 * Contact:
 *  - Vinay Rajur: https://github.com/vrajur
 *  - Jarkko Linnanvirta: https://github.com/Taitava/
 */

import {IParameters, Variable} from "./Variable";

export class Variable_Environment extends Variable {
    public variable_name = "environment";
    public help_text = "Gives an environment variable's value. It's an original value received when Obsidian was started.";

    protected always_available = false;

    protected static readonly parameters: IParameters = {
        variable: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        variable: string;
    }

    protected generateValue(): Promise<string|null> {
        // Check that the requested environment variable exists.
        return new Promise((resolve) => {
            if (this.isAvailable()) {
                // Yes, it exists.
                return resolve(process.env[this.arguments.variable] as string); // as string: tells TypeScript compiler that the item exists, is not undefined.
            } else {
                // It does not exist.
                // Freak out.
                this.newErrorMessage(`Environment variable named '${this.arguments.variable}' does not exist.`);
                return resolve(null);
            }
        });
    }

    public getHelpName(): string {
        return "<strong>{{environment:variable}}</strong>";
    }

    public isAvailable(): boolean {
        return undefined !== process.env[this.arguments.variable];
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> if the passed environment variable name exists.";
    }
}