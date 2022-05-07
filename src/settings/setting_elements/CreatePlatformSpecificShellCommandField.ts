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

import {CreateShellCommandFieldCore} from "./CreateShellCommandFieldCore";
import SC_Plugin from "../../main";
import {TShellCommand} from "../../TShellCommand";
import {PlatformId, PlatformNames} from "../SC_MainSettings";

export function createPlatformSpecificShellCommandField(plugin: SC_Plugin, container_element: HTMLElement, t_shell_command: TShellCommand, platform_id: PlatformId, show_autocomplete_menu: boolean) {
    const platform_name = PlatformNames[platform_id];
    const setting_group = CreateShellCommandFieldCore(
        plugin,
        container_element,
        "Shell command on " + platform_name,
        t_shell_command.getPlatformSpecificShellCommands()[platform_id] ?? "",
        t_shell_command.getShell(),
        t_shell_command,
        show_autocomplete_menu,
        async (shell_command: string) => {
            if (shell_command.length) {
                // shell_command is not empty, so it's a normal command.
                t_shell_command.getPlatformSpecificShellCommands()[platform_id] = shell_command;
            } else {
                // shell_command is empty, so the default command should be used.
                delete t_shell_command.getPlatformSpecificShellCommands()[platform_id];
            }
            await plugin.saveSettings();
        },
        t_shell_command.getDefaultShellCommand(),
    );
    setting_group.name_setting.setDesc("If empty, the default shell command will be used on " + platform_name + ".");
    return setting_group;
}