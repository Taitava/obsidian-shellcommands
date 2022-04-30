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

// @ts-ignore
import {clipboard} from "electron";
import {TShellCommand} from "../../TShellCommand";
import {Hotkey, setIcon} from "obsidian";
import {ExtraOptionsModal} from "../ExtraOptionsModal";
import {DeleteModal} from "../DeleteModal";
import {getHotkeysForShellCommand, HotkeyToString} from "../../Hotkeys";
import SC_Plugin from "../../main";
import {CreateShellCommandFieldCore} from "./CreateShellCommandFieldCore";
import {debugLog} from "../../Debug";
import {EOL} from "os";
import {escapeMarkdownLinkCharacters} from "../../Common";
import {
    ShellCommandExecutor
} from "../../imports";

/**
 *
 * @param plugin
 * @param container_element
 * @param shell_command_id Either a string formatted integer ("0", "1" etc) or "new" if it's a field for a command that does not exist yet.
 * @param show_autocomplete_menu
 */
export function createShellCommandField(plugin: SC_Plugin, container_element: HTMLElement, shell_command_id: string, show_autocomplete_menu: boolean) {
    const is_new = "new" === shell_command_id;
    let t_shell_command: TShellCommand;
    if (is_new) {
        // Create an empty command
        t_shell_command = plugin.newTShellCommand();
        shell_command_id = t_shell_command.getId(); // Replace "new" with a real id.
    } else {
        // Use an old shell command
        t_shell_command = plugin.getTShellCommands()[shell_command_id];
    }
    debugLog("Create command field for command #" + shell_command_id + (is_new ? " (NEW)" : ""));
    let shell_command: string;
    if (is_new) {
        shell_command = "";
    } else {
        shell_command = t_shell_command.getDefaultShellCommand();
    }

    const setting_group = CreateShellCommandFieldCore(
        plugin,
        container_element,
        generateShellCommandFieldName(shell_command_id, t_shell_command),
        shell_command,
        t_shell_command.getShell(),
        t_shell_command,
        show_autocomplete_menu,
        async (shell_command: string) => {
            if (is_new) {
                debugLog("Creating new command " + shell_command_id + ": " + shell_command);
            } else {
                debugLog("Command " + shell_command_id + " gonna change to: " + shell_command);
            }

            // Do this in both cases, when creating a new command and when changing an old one:
            t_shell_command.getConfiguration().platform_specific_commands.default = shell_command;

            if (is_new) {
                // Create a new command
                // plugin.registerShellCommand(t_shell_command); // I don't think this is needed to be done anymore
                debugLog("Command created.");
            } else {
                // Change an old command
                t_shell_command.renameObsidianCommand(t_shell_command.getShellCommand(), t_shell_command.getAlias()); // Change the command's name in Obsidian's command palette and in hotkey settings.
                debugLog("Command changed.");
            }
            await plugin.saveSettings();
        },
    );

    // Primary icon buttons
    setting_group.name_setting
        .addExtraButton(button => button
            .setTooltip("Execute now")
            .setIcon("run-command")
            .onClick(() => {
                // Execute the shell command now (for trying it out in the settings)
                const t_shell_command = plugin.getTShellCommands()[shell_command_id]; // TODO: Is this redundant? Could the t_shell_command defined in lines 22 / 26 (near 'const is_new') be used?
                const parsing_process = t_shell_command.createParsingProcess(null); // No SC_Event is available when executing shell commands manually.
                if (parsing_process.process()) {
                    const executor = new ShellCommandExecutor(plugin, t_shell_command, null); // No SC_Event is available when manually executing the shell command.
                    executor.doPreactionsAndExecuteShellCommand(parsing_process);
                } else {
                    parsing_process.displayErrorMessages();
                }
            })
        )
        .addExtraButton(button => button
            .setTooltip(ExtraOptionsModal.GENERAL_OPTIONS_SUMMARY)
            .onClick(async () => {
                // Open an extra options modal: General tab
                const modal = new ExtraOptionsModal(plugin, shell_command_id, setting_group, this);
                modal.open();
                modal.activateTab("extra-options-general");
            })
        )
        .addExtraButton(button => button
            .setTooltip(ExtraOptionsModal.PREACTIONS_OPTIONS_SUMMARY)
            .setIcon("note-glyph")
            .onClick(async () => {
                // Open an extra options modal: Preactions tab
                const modal = new ExtraOptionsModal(plugin, shell_command_id, setting_group, this);
                modal.open();
                modal.activateTab("extra-options-preactions");
            })
        )
        .addExtraButton(button => button
            .setTooltip(ExtraOptionsModal.OUTPUT_OPTIONS_SUMMARY)
            .setIcon("lines-of-text")
            .onClick(async () => {
                // Open an extra options modal: Output tab
                const modal = new ExtraOptionsModal(plugin, shell_command_id, setting_group, this);
                modal.open();
                modal.activateTab("extra-options-output");
            })
        )
        .addExtraButton(button => button
            .setTooltip(ExtraOptionsModal.ENVIRONMENTS_OPTIONS_SUMMARY)
            .setIcon("stacked-levels")
            .onClick(async () => {
                // Open an extra options modal: Environments tab
                const modal = new ExtraOptionsModal(plugin, shell_command_id, setting_group, this);
                modal.open();
                modal.activateTab("extra-options-environments");
            })
        )
        .addExtraButton(button => button
            .setTooltip(ExtraOptionsModal.EVENTS_SUMMARY)
            .setIcon("dice")
            .onClick(async () => {
                // Open an extra options modal: Events tab
                const modal = new ExtraOptionsModal(plugin, shell_command_id, setting_group, this);
                modal.open();
                modal.activateTab("extra-options-events");
            })
        )
        .addExtraButton(button => button
            .setTooltip(ExtraOptionsModal.VARIABLES_SUMMARY)
            .setIcon("code-glyph")
            .onClick(async () => {
                // Open an extra options modal: Variables tab
                const modal = new ExtraOptionsModal(plugin, shell_command_id, setting_group, this);
                modal.open();
                modal.activateTab("extra-options-variables");
            })
        )
        .addExtraButton(button => button
            .setTooltip("Delete this shell command")
            .setIcon("trash")
            .onClick(async () => {
                // Open a delete modal
                const modal = new DeleteModal(plugin, shell_command_id, setting_group, container_element);
                modal.open();
            })
        )
    ;

    // Informational icons (= non-clickable)
    const icon_container = setting_group.name_setting.nameEl.createEl("span", {attr: {class: "SC-main-icon-container"}});

    // "Ask confirmation" icon.
    const confirm_execution_icon_container = icon_container.createEl("span", {attr: {"aria-label": "Asks confirmation before execution.", class: "shell-commands-confirm-execution-icon-container"}});
    setIcon(confirm_execution_icon_container, "languages");
    if (!t_shell_command.getConfirmExecution()) {
        // Do not display the icon for commands that do not use confirmation.
        confirm_execution_icon_container.addClass("SC-hide");
    }

    // "Ignored error codes" icon
    const ignored_error_codes_icon_container = icon_container.createEl("span", {attr: {"aria-label": generateIgnoredErrorCodesIconTitle(t_shell_command.getIgnoreErrorCodes()), class: "shell-commands-ignored-error-codes-icon-container"}});
    setIcon(ignored_error_codes_icon_container, "strikethrough-glyph");
    if (!t_shell_command.getIgnoreErrorCodes().length) {
        // Do not display the icon for commands that do not ignore any errors.
        ignored_error_codes_icon_container.addClass("SC-hide");
    }

    // Secondary icon buttons
    setting_group.preview_setting.addExtraButton(button => button
        .setIcon("link")
        .setTooltip("Copy this shell command's Obsidian URI to the clipboard. Visiting the URI executes the shell command.")
        .onClick(() => {
            const ctrl_clicked = false; // TODO: Implement Ctrl/Cmd + clicking! Add to the end of the tooltip text: CmdOrCtrl() + " + click to include the alias text, too."
            // TODO: Implement also Ctrl/Cmd + Shift + clicking to copy the link in HTML format: <a href=""></a>
            // I asked about the Ctrl+click support here: https://discord.com/channels/686053708261228577/840286264964022302/968834348637888562
            const execution_uri = t_shell_command.getExecutionURI();
            let result: string;
            if (ctrl_clicked) {
                // A full link is wanted.
                result = `[${escapeMarkdownLinkCharacters(t_shell_command.getAlias())}](${escapeMarkdownLinkCharacters(execution_uri)})`;
            } else {
                // Only the URI is wanted.
                result = execution_uri;
            }

            clipboard.writeText(result);
            plugin.newNotification("Copied to clipboard: " + EOL + result);
        }),
    );

    if (t_shell_command.canHaveHotkeys()) {
        setting_group.preview_setting.addExtraButton(button => button
            .setIcon("any-key")
            .setTooltip("Go to hotkey settings.")
            .onClick(() => {
                // The most important parts of this closure function are copied 2022-04-27 from https://github.com/pjeby/hotkey-helper/blob/c8a032e4c52bd9ce08cb909cec15d1ed9d0a3439/src/plugin.js#L436-L442 (also from other lines of the same file).

                // @ts-ignore This is private API access. Not good, but then again the feature is not crucial - if it breaks, it won't interrupt anything important.
                plugin.app.setting?.openTabById("hotkeys");

                // @ts-ignore
                const hotkeys_settings_tab = plugin.app.setting.settingTabs.filter(tab => tab.id === "hotkeys").shift();
                if (hotkeys_settings_tab && hotkeys_settings_tab.searchInputEl && hotkeys_settings_tab.updateHotkeyVisibility) {
                    debugLog("Hotkeys: Filtering by shell command " + t_shell_command.getObsidianCommand().name);
                    hotkeys_settings_tab.searchInputEl.value = t_shell_command.getObsidianCommand().name;
                    hotkeys_settings_tab.updateHotkeyVisibility();
                } else {
                    debugLog("Hotkeys: Cannot do filtering due to API changes.");
                }
            }),
        );
    }

    // Add hotkey information
    if (!is_new && t_shell_command.canHaveHotkeys()) {
        const hotkeys = getHotkeysForShellCommand(plugin, shell_command_id);
        if (hotkeys) {
            let hotkeys_joined: string = "";
            hotkeys.forEach((hotkey: Hotkey) => {
                if (hotkeys_joined) {
                    hotkeys_joined += "<br>"
                }
                hotkeys_joined += HotkeyToString(hotkey);
            });
            const hotkey_div = setting_group.preview_setting.controlEl.createEl("div", {attr: {class: "setting-item-description SC-hotkey-info"}});
            // Comment out the icon because it would look like a clickable button (as there are other clickable icons in the settings).
            // setIcon(hotkey_div, "any-key", 22); // Hotkey icon
            hotkey_div.insertAdjacentHTML("beforeend", " " + hotkeys_joined);
        }
    }
    debugLog("Created.");
}

/**
 * @param shell_command_id String like "0" or "1" etc. TODO: Remove this parameter and use id from t_shell_command.
 * @param t_shell_command
 * @public Exported because ShellCommandExtraOptionsModal uses this too.
 */
export function generateShellCommandFieldName(shell_command_id: string, t_shell_command: TShellCommand) {
    if (t_shell_command.getAlias()) {
        return t_shell_command.getAlias();
    }
    return "Command #" + shell_command_id;
}

/**
 * @param ignored_error_codes
 * @public Exported because ShellCommandExtraOptionsModal uses this too.
 */
export function generateIgnoredErrorCodesIconTitle(ignored_error_codes: number[]) {
    const plural = ignored_error_codes.length !== 1 ? "s" : "";
    return "Ignored error"+plural+": " + ignored_error_codes.join(",");
}