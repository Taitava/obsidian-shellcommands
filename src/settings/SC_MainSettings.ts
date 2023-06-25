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

// SETTINGS AND DEFAULT VALUES
import {ShellCommandConfiguration} from "./ShellCommandConfiguration";
import SC_Plugin from "../main";
import {
    CustomVariableConfiguration,
    PromptConfiguration,
} from "../imports";
import {OutputWrapperConfiguration} from "../models/output_wrapper/OutputWrapper";
import {CustomShellConfiguration} from "../models/custom_shell/CustomShellModel";
import {
    GlobalVariableDefaultValueConfiguration,
} from "../variables/Variable";

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
    
    /**
     * TODO: Rename to execute_command_prefix. Consider moving the renamed setting to command_palette.
     */
    obsidian_command_palette_prefix: string;

    // Variables:
    /**
     * TODO: Consider removing this setting, or moving it to command_palette.
     */
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
    output_channel_notification_decorates_output: boolean | "stderr";

    // Events:
    enable_events: boolean;

    // Modals:
    approve_modals_by_pressing_enter_key: boolean;
    
    // Obsidian's command palette:
    command_palette: {
        re_execute_last_shell_command: {
            enabled: boolean,
            prefix: string,
        },
    },

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

    // Additional configuration for built-in variables. (Currently just global default values).
    builtin_variables: {
        [variableName: string]: {
            default_value: GlobalVariableDefaultValueConfiguration | null,
        }
    };

    // Custom variables
    custom_variables: CustomVariableConfiguration[];

    // Custom shells
    custom_shells: CustomShellConfiguration[];

    // Output wrappers
    output_wrappers: OutputWrapperConfiguration[];

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
        output_channel_notification_decorates_output: true,

        // Events:
        enable_events: true,

        // Modals:
        approve_modals_by_pressing_enter_key: true,
        
        // Obsidian's command palette:
        command_palette: {
            re_execute_last_shell_command: {
                enabled: true,
                prefix: "Re-execute: ",
            },
        },

        // Shell commands:
        max_visible_lines_in_shell_command_fields: false, // No limit by default.
        shell_commands: [],

        // Prompts:
        prompts: [],

        // Additional configuration for built-in variables:
        builtin_variables: {},

        // Custom variables
        custom_variables: [],

        // Custom shells
        custom_shells: [],

        // Output wrappers
        output_wrappers: [],
    };
}

/**
 * All OSes supported by the Shell commands plugin.
 * Values are borrowed from NodeJS.Platform.
 * "darwin" is macOS.
 *
 * This type must be synchronous to IPlatformSpecificString interface.
 *
 * @see NodeJS.Platform
 */
export type PlatformId = "darwin" | "linux" | "win32";

export const PlatformNames: IPlatformSpecificString = {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows",
};

/**
 * Same content as PlatformNames, but in a better accessible Map format.
 * TODO: Replace PlatformNames with this map, and convert usages of the old PlatformNames.
 */
export const PlatformNamesMap: Map<PlatformId, string> = new Map(Object.entries(PlatformNames) as [PlatformId,string][]);

/**
 * All OSes supported by the Shell commands plugin.
 * Values are borrowed from NodeJS.Platform.
 *
 * This interface must be synchronous to OperatingSystemName type.
 *
 * @see NodeJS.Platform
 */
export interface IPlatformSpecificString { // TODO: Rename to plural form: IPlatformSpecificStrings
    /** This is macOS */
    darwin?: string,
    linux?: string,
    win32?: string,
}

export interface IPlatformSpecificStringWithDefault extends IPlatformSpecificString {  // TODO: Rename to plural form: IPlatformSpecificStringsWithDefault
    default: string,
}

/**
 * Similar to IPlatformSpecificString, but for a custom type and without possibility to omit any property.
 */
export type IPlatformSpecificValues<Type>  = {
    [key in PlatformId]: Type
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
};

export type ExecutionNotificationMode = "disabled" | "quick" | "permanent" | "if-long";