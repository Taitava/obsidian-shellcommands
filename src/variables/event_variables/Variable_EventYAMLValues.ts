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

import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FileCreated} from "../../events/SC_Event_FileCreated";
import {SC_Event_FileContentModified} from "../../events/SC_Event_FileContentModified";
import {SC_Event_FileDeleted} from "../../events/SC_Event_FileDeleted";
import {SC_Event_FileRenamed} from "../../events/SC_Event_FileRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {EventVariable} from "./EventVariable";
import {
    getFileYAMLValue,
    YAMLMultipleValuesResult,
} from "../VariableHelpers";
import {IParameters} from "../Variable";
import {Shell} from "../../shells/Shell";

export class Variable_EventYAMLValues extends EventVariable {
    public variable_name = "event_yaml_values";
    public help_text = "Reads a list of values from the event related file's frontmatter. Takes a property name and separator as arguments. You can access nested properties with dot notation: property1.property2";

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

    protected supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FileCreated,
        SC_Event_FileContentModified,
        SC_Event_FileDeleted,
        SC_Event_FileMoved,
        SC_Event_FileRenamed,
    ];

    protected async generateValue(
        shell: Shell,
        castedArguments: {propertyName: string, separator: string},
        sc_event: SC_Event_FileMenu | SC_Event_FileCreated | SC_Event_FileContentModified | SC_Event_FileDeleted | SC_Event_FileMoved | SC_Event_FileRenamed,
    ): Promise<string> {
        this.requireCorrectEvent(sc_event);

        const yamlResult: YAMLMultipleValuesResult = getFileYAMLValue(
            this.app,
            sc_event.getFile(),
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
        return "<strong>{{event_yaml_values:property:separator}}</strong>";
    }
}