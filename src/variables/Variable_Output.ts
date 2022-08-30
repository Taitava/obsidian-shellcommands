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

import {Variable} from "./Variable";

export class Variable_Output extends Variable {
    public variable_name = "output";
    public help_text = "Gives text outputted by a shell command after it's executed.";

    protected always_available = false;

    private output_content: string;

    public setOutputContent(output_content: string) {
        this.output_content = output_content;
    }

    protected generateValue(): string {
        if (!this.isAvailable()) {
            this.newErrorMessage("This variable is only available in output wrappers.");
            return null;
        }

        return this.output_content;
    }

    public resetLate(): void {
        super.resetLate();

        // Remove 'output_content' after onetime usage.
        this.output_content = undefined;
    }

    /**
     * This variable is only available when parsing is done from an OutputWrapper, i.e. this.output_content is set.
     */
    public isAvailable(): boolean {
        return typeof this.output_content === "string";
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in <em>output wrappers</em>, cannot be used as input for shell commands.";
    }
}