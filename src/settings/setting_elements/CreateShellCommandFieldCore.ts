import SC_Plugin from "../../main";
import {ShellCommandSettingGroup} from "../ShellCommandsSettingsTab";
import {Setting} from "obsidian";
import {parseShellCommandVariables} from "../../variables/parseShellCommandVariables";
import {createAutocomplete} from "./Autocomplete";
import {getVariableAutocompleteItems} from "../../variables/getVariableAutocompleteItems";

export function CreateShellCommandFieldCore(
    plugin: SC_Plugin,
    container_element: HTMLElement,
    setting_name: string,
    shell_command: string,
    shell: string,
    show_autocomplete_menu: boolean,
    extra_on_change: (shell_command: string) => void,
    shell_command_placeholder: string = "Enter your command"
    ) {

    let setting_group: ShellCommandSettingGroup;

    function on_change(shell_command: string) {
        // Update preview
        setting_group.preview_setting.setDesc(getShellCommandPreview(plugin, shell_command, shell));

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
                .setDesc(getShellCommandPreview(plugin,shell_command, shell))
                .setClass("SC-preview-setting")
        ,
    };

    // Autocomplete menu
    if (show_autocomplete_menu) {
        // @ts-ignore
        const input_element: HTMLInputElement = setting_group.shell_command_setting.settingEl.find("input");
        createAutocomplete(input_element, getVariableAutocompleteItems(), on_change);
    }

    return setting_group;
}

/**
 *
 * @param plugin
 * @param shell_command
 * @public Exported because createShellCommandField uses this.
 */
export function getShellCommandPreview(plugin: SC_Plugin, shell_command: string, shell: string) {
    const parsed_shell_command = parseShellCommandVariables(plugin, shell_command, shell);
    if (Array.isArray(parsed_shell_command)) {
        // Variable parsing failed.
        // Return just the first error message, even if there are multiple errors, because the preview space is limited.
        return parsed_shell_command[0];
    }
    // Variable parsing succeeded
    return parsed_shell_command;
}