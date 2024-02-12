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

import {EventVariable} from "./EventVariable";
import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FileCreated} from "../../events/SC_Event_FileCreated";
import {SC_Event_FileContentModified} from "../../events/SC_Event_FileContentModified";
import {SC_Event_FileDeleted} from "../../events/SC_Event_FileDeleted";
import {SC_Event_FileRenamed} from "../../events/SC_Event_FileRenamed";
import {SC_Event_FileMoved} from "../../events/SC_Event_FileMoved";
import {getFileYAML} from "../../common/commonObsidian";
import {IAutocompleteItem} from "../../settings/setting_elements/Autocomplete";
import {IParameters} from "../Variable";
import {Shell} from "../../shells/Shell";

export class Variable_EventYAMLContent extends EventVariable {
    public variable_name = "event_yaml_content";
    public help_text = "Gives the event related note's YAML frontmatter. Dashes --- can be included or excluded.";

    protected static readonly parameters: IParameters = {
        withDashes: {
            options: ["with-dashes", "no-dashes"],
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

    protected generateValue(
        shell: Shell,
        castedArguments: {withDashes: "with-dashes" | "no-dashes"},
        sc_event: SC_Event_FileMenu | SC_Event_FileCreated | SC_Event_FileContentModified | SC_Event_FileDeleted | SC_Event_FileMoved | SC_Event_FileRenamed,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                this.requireCorrectEvent(sc_event);
            } catch (error) {
                // Need to catch here, because Variable.getValue()'s .catch() block won't be able to catch thrown errors,
                // it can only catch errors that were passed to reject().
                reject(error);
                return;
            }

            getFileYAML(this.app, sc_event.getFile(), castedArguments.withDashes === "with-dashes").then((yamlContent: string) => {
                if (null === yamlContent) {
                    // No YAML frontmatter.
                    this.reject("The event related file does not contain a YAML frontmatter.", reject);
                } else {
                    // Got a YAML frontmatter.
                    resolve(yamlContent);
                }
            });
        });
    }

    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Also, a YAML frontmatter section needs to be present.";
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dashes}}",
                help_text: "Gives the event related note's YAML frontmatter, wrapped between --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dashes}}",
                help_text: "Gives the event related note's YAML frontmatter, excluding top and bottom --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dashes}}",
                help_text: "Gives the event related note's YAML frontmatter, wrapped between --- lines." + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dashes}}",
                help_text: "Gives the event related note's YAML frontmatter, excluding top and bottom --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{event_yaml_content:with-dashes}}</strong> or <strong>{{event_yaml_content:no-dashes}}</strong>";
    }

}