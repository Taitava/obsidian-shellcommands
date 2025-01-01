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

import {IParameters} from "./Variable";
import {FileVariable} from "./FileVariable";
import {
    getFileYAMLValue,
    YAMLMultipleValuesResult,
} from "./VariableHelpers";
import {Shell} from "../shells/Shell";

export class Variable_YAMLValues extends FileVariable {
    public variable_name = "yaml_values";
    public help_text = "Reads a list of values from the current file's frontmatter. Takes a property name and separator as arguments. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        propertyName: {
            type: "string",
            required: true,
        },
        separator: {
            type: "string",
            required: true,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {propertyName: string, separator: string},
    ): Promise<string> {
        // We do have an active file
        const yamlResult: YAMLMultipleValuesResult = getFileYAMLValue(
            this.app,
            this.getFileOrThrow(),
            castedArguments.propertyName,
            true, // Insist the result to be a multi-value list instead of a scalar.
        );
        if (yamlResult.success) {
            // The result is ok.
            return yamlResult.multipleValues.join(castedArguments.separator);
        } else {
            // The result contains error message(s).
            this.throw(yamlResult.errorMessages.join(" "));
        }
    }
    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Also, the given YAML property must exist in the file's frontmatter.";
    }

    public getHelpName(): string {
        return "<strong>{{yaml_values:property:separator}}</strong>";
    }

}