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

import {
    IParameters,
    Variable,
} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import {Shell} from "../shells/Shell";

export class Variable_ShellCommandsPlugin extends Variable{
    public variable_name = "shell_commands_plugin";
    public help_text = "Gives the Shell commands plugin's version information.";

    protected static readonly parameters: IParameters = {
        property: {
            options: ["plugin-version", "settings-version"],
            required: true,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {property: "plugin-version" | "settings-version"},
    ): Promise<string> {
        switch (castedArguments.property) {
            case "plugin-version":
                return this.plugin.getPluginVersion();
            case "settings-version":
                return this.plugin.settings.settings_version;
        }
    }

    public getAutocompleteItems() {
        const autocompleteItems = [
            <IAutocompleteItem>{
                value: this.getFullName(false, "plugin-version"),
                help_text: "Gives the Shell commands plugin's current version. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, "settings-version"),
                help_text: "Gives the Shell commands plugin's settings structure version, which is almost identical to the plugin's version, but the patch version is usually 0 (in major.minor.patch version format). " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
        Variable.supplementAutocompleteItems(autocompleteItems);
        return autocompleteItems;
    }

    public getHelpName(): string {
        return "<strong>{{shell_commands_plugin:plugin-version}}</strong> or <strong>{{shell_commands_plugin:settings-version}}</strong>";
    }
    
    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in debug mode.";
    }
}