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

import SC_Plugin from "../../main";
import {SettingFieldGroup} from "../SC_MainSettingsTab";
import {Setting} from "obsidian";
import {parseVariables} from "../../variables/parseVariables";
import {
    createAutocomplete,
    IAutocompleteItem,
} from "./Autocomplete";
import {SC_Event} from "../../events/SC_Event";
import {TShellCommand} from "../../TShellCommand";
import {EOL} from "os";
import {decorateMultilineField} from "./multilineField";
import {Shell} from "../../shells/Shell";

/**
 * Creates a multiline text field for inputting a shell command, and an automatic preview text for it, that shows parsed {{variables}}.
 *
 * @param plugin
 * @param container_element
 * @param setting_icon_and_name
 * @param shell_command Textual shell command content.
 * @param shell
 * @param t_shell_command Will only be used to read default value configurations. Can be null if no TShellCommand is available, but then no default values can be accessed.
 * @param show_autocomplete_menu TODO: Remove this parameter and always read it from plugin settings.
 * @param extra_on_change
 * @param shell_command_placeholder
 * @param extraAutocompleteItems
 * @constructor
 */
export function CreateShellCommandFieldCore(
    plugin: SC_Plugin,
    container_element: HTMLElement,
    setting_icon_and_name: string,
    shell_command: string,
    shell: Shell,
    t_shell_command: TShellCommand | null,
    show_autocomplete_menu: boolean,
    extra_on_change: (shell_command: string) => void,
    onAfterPreviewGenerated?: () => void,
    shell_command_placeholder = "Enter your command",
    extraAutocompleteItems?: IAutocompleteItem[],
    ): SettingFieldGroup {

    async function on_change(shell_command: string) {
        // Update preview
        setting_group.preview_setting.setDesc(await getShellCommandPreview(plugin, shell_command, shell, t_shell_command, null /* No event is available during preview. */));

        // Let the caller extend this onChange, to preform saving the settings:
        extra_on_change(shell_command);
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
                .addTextArea(textareaComponent => {
                        textareaComponent
                            .setPlaceholder(shell_command_placeholder)
                            .setValue(shell_command)
                        ;
                        decorateMultilineField(plugin, textareaComponent, on_change);
                    }
                )
                .setClass("SC-shell-command-setting")
        ,
        preview_setting:
            new Setting(container_element)
                .setClass("SC-preview-setting")
                .then(async (setting: Setting) => {
                    setting.setDesc(await getShellCommandPreview(plugin, shell_command, shell, t_shell_command, null /* No event is available during preview. */));
                    onAfterPreviewGenerated?.();
                })
        ,
    };

    // Autocomplete menu
    if (show_autocomplete_menu) {
        createAutocomplete(
            plugin,
            setting_group.shell_command_setting.settingEl.find("textarea") as HTMLTextAreaElement,
            on_change,
            extraAutocompleteItems,
        );
    }

    return setting_group;
}

/**
 *
 * @param plugin
 * @param shell_command Textual shell command content.
 * @param shell
 * @param t_shell_command Will only be used to read default value configurations. Can be null if no TShellCommand is available, but then no default values can be accessed.
 * @param sc_event
 * @public Exported because createShellCommandField uses this.
 */
export async function getShellCommandPreview(plugin: SC_Plugin, shell_command: string, shell: Shell, t_shell_command: TShellCommand | null, sc_event: SC_Event | null): Promise<DocumentFragment> {
    const parsing_result = await parseVariables(plugin, shell_command, shell, true, t_shell_command, sc_event);
    let previewContent: string;
    if (!parsing_result.succeeded) {
        // Variable parsing failed.
        if (parsing_result.error_messages.length > 0) {
            // Return all error messages, each in its own line. (Usually there's just one message).
            previewContent = parsing_result.error_messages.join(EOL); // Newlines are converted to <br>'s below.
        } else {
            // If there are no error messages, then errors are silently ignored by user's variable configuration.
            // The preview can then show the original, unparsed shell command.
            previewContent = shell_command;
        }
    } else {
        // Variable parsing succeeded
        previewContent = parsing_result.parsed_content as string;
    }
    
    // Convert the preview text to a DocumentFragment.
    const previewContentLines: string[] = previewContent.split(/\r\n|\r|\n/g); // Don't use ( ) with | because .split() would then include the newline characters in the resulting array.
    const documentFragment: DocumentFragment = new DocumentFragment();
    for (const previewContentLine of previewContentLines) {
        if (documentFragment.firstChild !== null) {
            // If earlier content exists, add a separating <br>.
            documentFragment.createEl("br");
        }
        documentFragment.appendText(previewContentLine);
    }
    return documentFragment;
}