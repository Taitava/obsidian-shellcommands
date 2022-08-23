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

// SETTINGS AND DEFAULT VALUES
import {ShellCommandConfiguration} from "./ShellCommandConfiguration";
import SC_Plugin from "../main";
import {
    CustomVariableConfiguration,
    PromptConfiguration,
} from "../imports";

export type SettingsVersionString = "prior-to-0.7.0" | string;

export interface SC_MainSettings {

    // Common:
    settings_version: SettingsVersionString;

    // Hidden settings (no UI controls in the settings panel)
    /**
     * If true, logging stuff to console.log() will be enabled.
     * Might also enable some testing {{variables}} in the future, perhaps.
     */
    debug: boolean;
    obsidian_command_palette_prefix: string;

    // Variables:
    preview_variables_in_command_palette: boolean;
    show_autocomplete_menu: boolean;

    // Environments:
    working_directory: string;
    default_shells: IPlatformSpecificString;
    environment_variable_path_augmentations: IPlatformSpecificString;

    // Output:
    error_message_duration: number;
    notification_message_duration: number;
    execution_notification_mode: ExecutionNotificationMode;
    output_channel_clipboard_also_outputs_to_notification: boolean;

    // Events:
    enable_events: boolean;

    // Modals:
    approve_modals_by_pressing_enter_key: boolean;

    // Shell commands:
    /** If it's a number, limit the max height of a textarea. If it's false, don't limit at all. */
    max_visible_lines_in_shell_command_fields: number | false;

    /**
     * Was before 0.15.0: An object where the key was an id and value was a ShellCommandConfiguration object.
     * Now it's an array of ShellCommandConfiguration objects.
     */
    shell_commands: ShellCommandConfiguration[];

    // Prompts:
    prompts: PromptConfiguration[];

    // Custom variables
    custom_variables: CustomVariableConfiguration[];

    // Legacy:
    /** @deprecated Use shell_commands object instead of this array. From now on, this array can be used only for migrating old configuration to shell_commands.*/
    commands?: string[];
}

export function getDefaultSettings(is_new_installation: boolean): SC_MainSettings {
    return {
        // Common:
        settings_version: is_new_installation
            ? SC_Plugin.SettingsVersion // For new installations, a specific settings version number can be used, as migrations do not need to be taken into account.
            : "prior-to-0.7.0"  // This will be substituted by ShellCommandsPlugin.saveSettings() when the settings are saved.
        ,

        // Hidden settings (no UI controls in the settings panel)
        debug: false,
        obsidian_command_palette_prefix: "Execute: ",

        // Variables:
        preview_variables_in_command_palette: true,
        show_autocomplete_menu: true,

        // Environments:
        working_directory: "",
        default_shells: {},
        environment_variable_path_augmentations: {},

        // Output:
        error_message_duration: 20,
        notification_message_duration: 10,
        execution_notification_mode: "disabled",
        output_channel_clipboard_also_outputs_to_notification: true,

        // Events:
        enable_events: true,

        // Modals:
        approve_modals_by_pressing_enter_key: true,

        // Shell commands:
        max_visible_lines_in_shell_command_fields: false, // No limit by default.
        shell_commands: [],

        // Prompts:
        prompts: [],

        // Custom variables
        custom_variables: [],
    }
}

/**
 * All OSes supported by the Shell commands plugin.
 * Values are borrowed from NodeJS.Platform.
 * "darwin" = Macintosh.
 *
 * This type must be synchronous to IOperatingSystemSpecificString interface.
 *
 * @see NodeJS.Platform
 */
export type PlatformId = "darwin" | "linux" | "win32";

export const PlatformNames: IPlatformSpecificString = {
    darwin: "Macintosh",
    linux: "Linux",
    win32: "Windows",
};

/**
 * All OSes supported by the Shell commands plugin.
 * Values are borrowed from NodeJS.Platform.
 *
 * This interface must be synchronous to OperatingSystemName type.
 *
 * @see NodeJS.Platform
 */
export interface IPlatformSpecificString {
    /** This is Macintosh */
    darwin?: string,
    linux?: string,
    win32?: string,
}

export interface IPlatformSpecificStringWithDefault extends IPlatformSpecificString{
    default: string,
}

export type ICommandPaletteOptions = {
    enabled: string;
    unlisted: string;
    disabled: string;
}

export const CommandPaletteOptions: ICommandPaletteOptions = {
    enabled: "Command palette & hotkeys",
    unlisted: "Hotkeys only",
    disabled: "Excluded",
}

export type ExecutionNotificationMode = "disabled" | "quick" | "permanent" | "if-long";