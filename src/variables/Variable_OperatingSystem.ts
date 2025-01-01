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
import {
    getCurrentPlatformName,
    getOperatingSystem,
} from "../Common";

export class Variable_OperatingSystem extends Variable{
    public variable_name = "operating_system";
    public help_text = "Gives the current operating system's id code or human-readable name.";

    protected static readonly parameters: IParameters = {
        property: {
            options: ["id", "name"],
            required: true,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {property: "id" | "name" },
    ): Promise<string> {
        switch (castedArguments.property) {
            case "id":
                return getOperatingSystem();
            case "name":
                return getCurrentPlatformName();
        }
    }

    public getAutocompleteItems() {
        const autocompleteItems = [
            <IAutocompleteItem>{
                value: this.getFullName(false, "id"),
                help_text: "Gives the current operating system's id code, i.e. \"darwin\" (= macOS), \"linux\", or \"win32\" (= Windows). Good for scripts as id comes from `navigator.platform` and is not likely to change. For a human-readable value, use :name instead." + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, "name"),
                help_text: "Gives the current operating system's human-readable name. As the OS names are defined in the SC plugin's source code, they might change if they need improving. If you need non-changing names, use :id instead." + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
        Variable.supplementAutocompleteItems(autocompleteItems);
        return autocompleteItems;
    }

    public getHelpName(): string {
        return "<strong>{{operating_system:id}}</strong>, <strong>{{operating_system:name}}</strong>, <strong>{{operating_system:release}}</strong> or <strong>{{file_path:version}}</strong>";
    }
    
    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in debug mode.";
    }
}