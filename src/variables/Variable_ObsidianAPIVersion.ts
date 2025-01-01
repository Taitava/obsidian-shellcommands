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

import {
    IParameters,
    Variable,
} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {Shell} from "../shells/Shell";
import {apiVersion} from "obsidian";
import {getVersionPart} from "../Common";

export class Variable_ObsidianAPIVersion extends Variable {
    public variable_name = "obsidian_api_version";
    public help_text = "Gives Obsidian's API version, which follows the release cycle of the desktop application.";

    protected static readonly parameters: IParameters = {
        part: {
            options: ["major", "minor", "patch"],
            required: false,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {part?: "major" | "minor" | "patch"},
    ): Promise<string> {
        if (undefined === castedArguments.part) {
            // Return the whole version.
            return apiVersion;
        }
        
        // Return a part of the version.
        const versionPart: string | null = getVersionPart(apiVersion, castedArguments.part);
        if (null === versionPart) {
            throw new Error("Obsidian API version (" + apiVersion + ") does not contain the part: " + castedArguments.part);
        }
        return versionPart;
    }

    public getAutocompleteItems() {
        const autocompleteItems = [
            <IAutocompleteItem>{
                value: this.getFullName(),
                help_text: this.help_text + " " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, "major"),
                help_text: "Gives Obsidian's API version's first part, e.g. 1 from 1.5.3 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, "minor"),
                help_text: "Gives Obsidian's API version's middle part, e.g. 5 from 1.5.3 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, "patch"),
                help_text: "Gives Obsidian's API version's last part, e.g. 3 from 1.5.3 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
        Variable.supplementAutocompleteItems(autocompleteItems);
        return autocompleteItems;
    }

    public getHelpName(): string {
        return "<strong>{{obsidian_api_version}}</strong> or <strong>{{obsidian_api_version:major|minor|patch}}</strong>";
    }
}