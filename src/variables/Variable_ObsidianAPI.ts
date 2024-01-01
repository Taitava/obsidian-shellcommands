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

import {
    IParameters,
    Variable,
} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {Shell} from "../shells/Shell";
import { apiVersion } from "obsidian";

export class Variable_ObsidianAPI extends Variable{
    public variable_name = "obsidian_api";
    public help_text = "Gives Obsidian's API version.";

    protected static readonly parameters: IParameters = {
        property: {
            options: ["version"], // Currently this is the only option, but others may be added later.
            required: true,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {property: "version" },
    ): Promise<string> {
        switch (castedArguments.property) {
            case "version":
                return apiVersion;
        }
    }

    public getAutocompleteItems() {
        const autocompleteItems = [
            <IAutocompleteItem>{
                value: this.getFullName(false, "version"),
                help_text: "Gives Obsidian's API version, which follows the release cycle of the desktop application." + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
        Variable.supplementAutocompleteItems(autocompleteItems);
        return autocompleteItems;
    }

    public getHelpName(): string {
        return "<strong>{{obsidian_api:version}}</strong>";
    }
    
    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in debug mode.";
    }
}