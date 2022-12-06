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

import SC_Plugin from "../../main";
import {SettingFieldGroup} from "../SC_MainSettingsTab";
import {Setting} from "obsidian";
import {parseVariables} from "../../variables/parseVariables";
import {createAutocomplete} from "./Autocomplete";
import {SC_Event} from "../../events/SC_Event";
import {TShellCommand} from "../../TShellCommand";
import {createMultilineTextElement} from "../../Common";
import {EOL} from "os";
import {Shell} from "../../shells/Shell";

export function CreateShellCommandFieldCore(
    plugin: SC_Plugin,
    container_element: HTMLElement,
    setting_icon_and_name: string,
    shell_command: string,
    shell: Shell,
    t_shell_command: TShellCommand,
    show_autocomplete_menu: boolean,
    extra_on_change: (shell_command: string) => void,
    shell_command_placeholder = "Enter your command"
    ) {

    async function on_change(shell_command: string) {
        // Update preview
        setting_group.preview_setting.descEl.innerHTML = ""; // Remove previous content.
        createMultilineTextElement(
            "span", // TODO: Maybe cleaner would be not to create a <span>, but to insert the content directly into descEl.
            await getShellCommandPreview(plugin, shell_command, shell, t_shell_command, null /* No event is available during preview. */),
            setting_group.preview_setting.descEl,
        );

        // Let the caller extend this onChange, to preform saving the settings:
        extra_on_change(shell_command);

        // Resize the shell command textarea to match the amount of lines in it.
        update_textarea_height(shell_command, shell_command_placeholder);
    }

    function update_textarea_height(shell_command: string, shell_command_placeholder: string) {
        const newlines_pattern = /\r\n|\r|\n/;
        const count_lines_in_shell_command = shell_command.split(newlines_pattern).length;
        const count_lines_in_shell_command_placeholder = shell_command_placeholder.split(newlines_pattern).length;
        let count_lines_final = Math.max(
            count_lines_in_shell_command,
            count_lines_in_shell_command_placeholder,
        );
        if (plugin.settings.max_visible_lines_in_shell_command_fields) {
            // Limit the height so that the field will not take up too much space.
            count_lines_final = Math.min(
                plugin.settings.max_visible_lines_in_shell_command_fields,
                count_lines_final,
            );
        }
        (setting_group.shell_command_setting.settingEl.find("textarea") as HTMLTextAreaElement).rows = count_lines_final;
    }

    const setting_group: SettingFieldGroup = {
        name_setting:
            new Setting(container_element)
                .setClass("SC-name-setting")
                .then((name_setting) => {
                    name_setting.nameEl.innerHTML = setting_icon_and_name;
                })
        ,
        shell_command_setting:
            new Setting(container_element)
                .addTextArea(text => text
                    .setPlaceholder(shell_command_placeholder)
                    .setValue(shell_command)
                    .onChange(on_change)
                )
                .setClass("SC-shell-command-setting")
        ,
        preview_setting:
            new Setting(container_element)
                .setClass("SC-preview-setting")
                .then(async (setting: Setting) => {
                    setting.descEl.innerHTML = ""; // Remove previous content. Not actually needed here because it's empty already, but do it just in case.
                    createMultilineTextElement(
                        "span", // TODO: Maybe cleaner would be not to create a <span>, but to insert the content directly into descEl.
                        await getShellCommandPreview(plugin, shell_command, shell, t_shell_command, null /* No event is available during preview. */),
                        setting.descEl,
                    );
                })
        ,
    };
    update_textarea_height(shell_command, shell_command_placeholder);

    // Autocomplete menu
    if (show_autocomplete_menu) {
        createAutocomplete(plugin, setting_group.shell_command_setting.settingEl.find("textarea") as HTMLTextAreaElement, on_change);
    }

    return setting_group;
}

/**
 *
 * @param plugin
 * @param shell_command
 * @param shell
 * @param t_shell_command
 * @param sc_event
 * @public Exported because createShellCommandField uses this.
 */
export async function getShellCommandPreview(plugin: SC_Plugin, shell_command: string, shell: Shell, t_shell_command: TShellCommand, sc_event: SC_Event | null): Promise<string> {
    const parsing_result = await parseVariables(plugin, shell_command, shell, true, t_shell_command, sc_event);
    if (!parsing_result.succeeded) {
        // Variable parsing failed.
        if (parsing_result.error_messages.length > 0) {
            // Return all error messages, each in its own line. (Usually there's just one message).
            return parsing_result.error_messages.join(EOL); // Newlines are converted to <br>'s by the consumers of this function.
        } else {
            // If there are no error messages, then errors are silently ignored by user's variable configuration.
            // The preview can then show the original, unparsed shell command.
            return shell_command;
        }
    }
    // Variable parsing succeeded
    return parsing_result.parsed_content as string;
}