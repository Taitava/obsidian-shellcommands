import SC_Plugin from "../../main";
import {SettingFieldGroup} from "../SC_MainSettingsTab";
import {Setting} from "obsidian";
import {parseVariables} from "../../variables/parseVariables";
import {createAutocomplete} from "./Autocomplete";
import {getVariableAutocompleteItems} from "../../variables/getVariableAutocompleteItems";
import {SC_Event} from "../../events/SC_Event";
import {TShellCommand} from "../../TShellCommand";

export function CreateShellCommandFieldCore(
    plugin: SC_Plugin,
    container_element: HTMLElement,
    setting_name: string,
    shell_command: string,
    shell: string,
    t_shell_command: TShellCommand,
    show_autocomplete_menu: boolean,
    extra_on_change: (shell_command: string) => void,
    shell_command_placeholder: string = "Enter your command"
    ) {

    let setting_group: SettingFieldGroup;

    function on_change(shell_command: string) {
        // Update preview
        setting_group.preview_setting.setDesc(getShellCommandPreview(plugin, shell_command, shell, t_shell_command, null /* No event is available during preview. */));

        // Let the caller extend this onChange, to preform saving the settings:
        extra_on_change(shell_command);
    }

    setting_group = {
        name_setting:
            new Setting(container_element)
                .setName(setting_name)
                .setClass("SC-name-setting")
        ,
        shell_command_setting:
            new Setting(container_element)
                .addText(text => text
                    .setPlaceholder(shell_command_placeholder)
                    .setValue(shell_command)
                    .onChange(on_change)
                )
                .setClass("SC-shell-command-setting")
        ,
        preview_setting:
            new Setting(container_element)
                .setDesc(getShellCommandPreview(plugin,shell_command, shell, t_shell_command, null /* No event is available during preview. */))
                .setClass("SC-preview-setting")
        ,
    };

    // Autocomplete menu
    if (show_autocomplete_menu) {
        // @ts-ignore
        const input_element: HTMLInputElement = setting_group.shell_command_setting.settingEl.find("input");
        createAutocomplete(plugin, input_element, on_change);
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
export function getShellCommandPreview(plugin: SC_Plugin, shell_command: string, shell: string, t_shell_command: TShellCommand, sc_event: SC_Event | null) {
    const parsing_result = parseVariables(plugin, shell_command, shell, t_shell_command, sc_event);
    if (!parsing_result.succeeded) {
        // Variable parsing failed.
        if (parsing_result.error_messages.length > 0) {
            // Return just the first error message, even if there are multiple errors, because the preview space is limited.
            return parsing_result.error_messages[0];
        } else {
            // If there are no error messages, then errors are silently ignored by user's variable configuration.
            // The preview can then show the original, unparsed shell command.
            return shell_command;
        }
    }
    // Variable parsing succeeded
    return parsing_result.parsed_content;
}