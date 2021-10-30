import ShellCommandsPlugin from "../../main";
import {ShellCommandSettingGroup} from "../ShellCommandsSettingsTab";
import {Setting} from "obsidian";
import {parseShellCommandVariables} from "../../variables/parseShellCommandVariables";

export function CreateShellCommandFieldCore(
    plugin: ShellCommandsPlugin,
    container_element: HTMLElement,
    setting_name: string,
    shell_command: string,
    shell: string,
    on_change: (shell_command: string) => void,
    shell_command_placeholder: string = "Enter your command"
    ) {
    let setting_group: ShellCommandSettingGroup = {
        name_setting:
            new Setting(container_element)
                .setName(setting_name)
                .setClass("shell-commands-name-setting")
        ,
        shell_command_setting:
            new Setting(container_element)
                .addText(text => text
                    .setPlaceholder(shell_command_placeholder)
                    .setValue(shell_command)
                    .onChange((shell_command) => {
                        // Update preview
                        setting_group.preview_setting.setDesc(getShellCommandPreview(plugin, shell_command, shell));

                        // Let the caller extend this onChange, to preform saving the settings:
                        on_change(shell_command);
                    })
                )
                .setClass("shell-commands-shell-command-setting")
        ,
        preview_setting:
            new Setting(container_element)
                .setDesc(getShellCommandPreview(plugin,shell_command, shell))
                .setClass("shell-commands-preview-setting")
        ,
    };
    return setting_group;
}

/**
 *
 * @param plugin
 * @param shell_command
 * @public Exported because createShellCommandField uses this.
 */
export function getShellCommandPreview(plugin: ShellCommandsPlugin, shell_command: string, shell: string) {
    let parsed_shell_command = parseShellCommandVariables(plugin, shell_command, shell); // false: disables notifications if variables have syntax errors.
    if (Array.isArray(parsed_shell_command)) {
        // Variable parsing failed.
        // Return just the first error message, even if there are multiple errors, because the preview space is limited.
        return parsed_shell_command[0];
    }
    // Variable parsing succeeded
    return parsed_shell_command;
}