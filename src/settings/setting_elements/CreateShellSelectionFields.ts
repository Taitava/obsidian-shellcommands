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
    IPlatformSpecificString,
    IPlatformSpecificValues,
    PlatformId,
    PlatformNames,
} from "../SC_MainSettings";
import {extractFileName, getOperatingSystem} from "../../Common";
import {
    getShellsForPlatform,
    getUsersDefaultShellIdentifier,
} from "../../shells/ShellFunctions";
import {Setting} from "obsidian";
import SC_Plugin from "../../main";
import {Shell} from "../../shells/Shell";

export function createShellSelectionFields(
    plugin: SC_Plugin,
    containerElement: HTMLElement,
    shells: IPlatformSpecificString,
    is_global_settings: boolean,
): IPlatformSpecificValues<Setting> {
    const shellSelectionSettings: IPlatformSpecificValues<Setting> = {
        darwin: new Setting(containerElement),
        linux: new Setting(containerElement),
        win32: new Setting(containerElement),
    };
    let platform_id: PlatformId;
    for (platform_id in PlatformNames) {
        const platform_name = PlatformNames[platform_id];
        let options: Record<string, string>;
        if (is_global_settings) {
            const currentSystemDefault = (getOperatingSystem() === platform_id) ? " (" + extractFileName(getUsersDefaultShellIdentifier()) + ")" : "";
            options = {"default": "Use system default" + currentSystemDefault};
        } else {
            const defaultShell: Shell | null = plugin.getDefaultShellForPlatform(platform_id);
            options = {
                "default": "Use default (" + (defaultShell?.getName() ?? "system default") + ")",
            };
        }

        // Get human-readable shell names
        for (const shell of getShellsForPlatform(platform_id)) {
            options[shell.getIdentifier()] = shell.getName();
        }
        const setting: Setting = shellSelectionSettings[platform_id];
        setting
            .setName(platform_name + (is_global_settings ? " default shell" : " shell"))
            .setDesc((is_global_settings ? "Can be overridden by each shell command. " : "") + ("win32" === platform_id ? "Powershell is recommended over cmd.exe, because this plugin does not support escaping variables in CMD." : ""))
            .addDropdown(dropdown => dropdown
                .addOptions(options)
                .setValue(shells[platform_id] ?? "default")
                .onChange(((_platform_id: PlatformId) => {
                    return async (value: string) => { // Need to use a nested function so that platform_id can be stored statically, otherwise it would always be "win32" (the last value of PlatformNames).
                        if ("default" === value) {
                            // When using default shell, the value should be unset.
                            delete shells[_platform_id];
                        } else {
                            // Normal case: assign the shell value.
                            shells[_platform_id] = value;
                        }
                        await plugin.saveSettings();
                    };
                })(platform_id))
            )
        ;
    }
    return shellSelectionSettings;
}