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
import {getVersionPart} from "../Common";
import SC_Plugin from "../main";

export class Variable_ShellCommandsPluginVersion extends Variable {
    public variable_name = "shell_commands_plugin_version";
    public help_text = "Gives the plugin's version or settings structure version.";

    protected static readonly parameters: IParameters = {
        subject: {
            options: ["plugin", "settings"],
            required: true,
        },
        part: {
            options: ["major", "minor", "patch"],
            required: false,
        },
    };

    protected async generateValue(
        shell: Shell,
        castedArguments: {subject: "plugin" | "settings", part?: "major" | "minor" | "patch"},
    ): Promise<string> {
        let version: string;
        switch (castedArguments.subject) {
            case "plugin":
                version = this.plugin.getPluginVersion();
                break;
            case "settings":
                version = SC_Plugin.SettingsVersion;
                break;
        }
        
        if (undefined === castedArguments.part) {
            // Return the whole version.
            return version;
        }
        
        // Return a part of the version.
        const versionPart: string | null = getVersionPart(version, castedArguments.part);
        if (null === versionPart) {
            throw new Error("Shell commands " + castedArguments.subject + " version (" + version + ") does not contain the part: " + castedArguments.part);
        }
        return versionPart;
    }

    public getAutocompleteItems() {
        const autocompleteItems = [
            <IAutocompleteItem>{
                value: this.getFullName(false, ["plugin"]),
                help_text: "Gives the Shell commands plugin's version.",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["plugin", "major"]),
                help_text: "Gives the Shell commands plugin's version's first part, e.g. 0 from 0.22.1 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["plugin", "minor"]),
                help_text: "Gives the Shell commands plugin's version's middle part, e.g. 22 from 0.22.1 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["plugin", "patch"]),
                help_text: "Gives the Shell commands plugin's version's last part, e.g. 1 from 0.22.1 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["settings"]),
                help_text: "Gives the Shell commands' settings structure version, which is not always increased with new plugin versions.",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["settings", "major"]),
                help_text: "Gives the Shell commands' settings structure version's first part, e.g. 0 from 0.22.0 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["settings", "minor"]),
                help_text: "Gives the Shell commands' settings structure version's middle part, e.g. 22 from 0.22.0 .",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: this.getFullName(false, ["settings", "patch"]),
                help_text: "Gives the Shell commands' settings structure version's last part, e.g. 0 from 0.22.0 . It hardly ever differs from 0.",
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
        Variable.supplementAutocompleteItems(autocompleteItems);
        return autocompleteItems;
    }

    public getHelpName(): string {
        return "<strong>{{shell_commands_plugin_version:plugin}}</strong>, <strong>{{shell_commands_plugin_version:plugin:major|minor|patch}}</strong>, <strong>{{shell_commands_plugin_version:settings}}</strong> or <strong>{{shell_commands_plugin_version:settings:major|minor|patch}}</strong>";
    }
}