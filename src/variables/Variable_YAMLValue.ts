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

import {IParameters} from "./Variable";
import {FileVariable} from "./FileVariable";
import {getFileYAMLValue} from "./VariableHelpers";
import {TFile} from "obsidian";

export class Variable_YAMLValue extends FileVariable {
    public variable_name = "yaml_value";
    public help_text = "Reads a single value from the current file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        property_name: string;
    }

    protected generateValue(): string {
        const active_file = this.getFile();
        if (active_file) {
            // We do have an active file
            const result = this.getFileYAMLValue(active_file);
            if (Array.isArray(result)) {
                // The result contains error message(s).
                this.newErrorMessages(result as string[]);
                return null;
            } else {
                // The result is ok, it's a string.
                return result as string;
            }
        } else {
            // No file is active at the moment
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }

    private yaml_value_cache: string[] | string;
    private getFileYAMLValue(active_file: TFile): string[] | string {
        if (!this.yaml_value_cache) {
            this.yaml_value_cache = getFileYAMLValue(this.app, active_file, this.arguments.property_name);
        }
        return this.yaml_value_cache;
    }

    public reset(): void {
        super.reset();
        this.yaml_value_cache = undefined;
    }

    public isAvailable(): boolean {
        if (!super.isAvailable()) {
            return false;
        }

        const active_file = this.getFile();
        return typeof this.getFileYAMLValue(active_file) === "string";
    }

}