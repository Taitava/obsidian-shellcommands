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

import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FileCreated} from "../../events/SC_Event_FileCreated";
import {SC_Event_FileContentModified} from "../../events/SC_Event_FileContentModified";
import {SC_Event_FileDeleted} from "../../events/SC_Event_FileDeleted";
import {SC_Event_FileRenamed} from "../../events/SC_Event_FileRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {EventVariable} from "./EventVariable";
import {getFileYAMLValue} from "../VariableHelpers";
import {IParameters} from "../Variable";
import {TFile} from "obsidian";

export class Variable_EventYAMLValue extends EventVariable {
    public variable_name = "event_yaml_value";
    public help_text = "Reads a single value from the event related file's frontmatter. Takes a property name as an argument. You can access nested properties with dot notation: property1.property2";

    protected static readonly parameters: IParameters = {
        property_name: {
            type: "string",
            required: true,
        },
    };

    protected arguments: {
        property_name: string;
    }

    protected supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FileCreated,
        SC_Event_FileContentModified,
        SC_Event_FileDeleted,
        SC_Event_FileMoved,
        SC_Event_FileRenamed,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu | SC_Event_FileCreated | SC_Event_FileContentModified | SC_Event_FileDeleted | SC_Event_FileMoved | SC_Event_FileRenamed): Promise<string | null> {
        return new Promise((resolve) => {
            if (!this.checkSC_EventSupport(sc_event)) {
                return resolve(null);
            }

            const file = sc_event.getFile();
            const result = this.getFileYAMLValue(file);
            if (Array.isArray(result)) {
                // The result contains error message(s).
                this.newErrorMessages(result as string[]);
                return resolve(null);
            } else {
                // The result is ok, it's a string.
                return resolve(result as string);
            }
        });
    }

    private yaml_value_cache: string[] | string | undefined; // undefined = allow resetting back to undefined in .reset()
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

    public async isAvailable(sc_event: SC_Event_FileMenu /* TODO: This type should actually be SC_Event, as the method might be called with whatever SC_Event. */ | null): Promise<boolean> {
        if (!await super.isAvailable(sc_event) || null == sc_event) { // The null check is redundant, but needed for TS compiler to understand that sc_event.getFile() won't happen on null.
            return false;
        }

        const active_file = sc_event.getFile();
        return typeof this.getFileYAMLValue(active_file) === "string";
    }

    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Also, the given YAML property must exist in the file's frontmatter.";
    }

    public getHelpName(): string {
        return "<strong>{{event_yaml_value:property}}</strong>";
    }
}