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

import {FileVariable} from "./FileVariable";
import {
    getFileYAML,
} from "../Common";
import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";

export class Variable_YAMLContent extends FileVariable {
    public variable_name = "yaml_content";
    public help_text = "Gives the current note's YAML frontmatter. Dashes --- can be included or excluded.";

    protected static readonly parameters: IParameters = {
        withDashes: {
            options: ["with-dashes", "no-dashes"],
            required: true,
        },
    };

    protected generateValue(castedArguments: {withDashes: "with-dashes" | "no-dashes"}): Promise<string|null> {
        return new Promise((resolve) => {
            const activeFile = this.getFile();
            if (!activeFile) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            getFileYAML(this.app, activeFile, "with-dashes" === castedArguments.withDashes).then((yamlContent: string) => {
                if (null === yamlContent) {
                    this.newErrorMessage("The current file does not contain a YAML frontmatter.");
                }
                resolve(yamlContent);
            });
        });
    }

    public async isAvailable(castedArguments: {withDashes: "with-dashes" | "no-dashes"}): Promise<boolean> {
        const activeFile = this.getFile();

        if (!await super.isAvailable(castedArguments) || !activeFile) {
            return false;
        }

        return null !== await getFileYAML(this.app, activeFile, "with-dashes" === castedArguments.withDashes);
    }

    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Also, a YAML frontmatter section needs to be present.";
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, wrapped between --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, excluding top and bottom --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, wrapped between --- lines." + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, excluding top and bottom --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{yaml_content:with-dashes}}</strong> or <strong>{{yaml_content:no-dashes}}</strong>";
    }
}