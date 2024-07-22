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

import {IParameters} from "./Variable";
import {FileVariable} from "./FileVariable";
import {
    getFileYAMLValue,
    YAMLSingleValueResult,
} from "./VariableHelpers";
import {Shell} from "../shells/Shell";

export class Variable_YAMLValue extends FileVariable {
    public variable_name = "yaml_value";
    public help_text = "Reads a single value from the current file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {property_name: string},
    ): Promise<string> {
        // We do have an active file
        const yamlResult: YAMLSingleValueResult = getFileYAMLValue(
            this.app,
            this.getFileOrThrow(),
            castedArguments.property_name,
            false, // Deny the result if it's a multi-value list instead of a scalar.
        );
        if (yamlResult.success) {
            // The result is ok.
            return yamlResult.singleValue;
        } else {
            // The result contains error message(s).
            this.throw(yamlResult.errorMessages.join(" "));
        }
    }
    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Also, the given YAML property must exist in the file's frontmatter.";
    }

    public getHelpName(): string {
        return "<strong>{{yaml_value:property}}</strong>";
    }

}