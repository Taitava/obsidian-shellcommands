// SETTINGS AND DEFAULT VALUES
import {ShellCommandsConfiguration} from "./ShellCommandConfiguration";

export type SettingsVersionString = "prior-to-0.7.0" | string;

export interface ShellCommandsPluginSettings {

    // Common:
    settings_version: SettingsVersionString;
    /**
     * If true, logging stuff to console.log() will be enabled.
     * Might also enable some testing {{variables}} in the future, perhaps.
     */
    debug: boolean;

    // Variables:
    preview_variables_in_command_palette: boolean;
    show_autocomplete_menu: boolean;

    // Operating systems & shells:
    working_directory: string;
    default_shells: IPlatformSpecificString;

    // Output:
    error_message_duration: number;
    notification_message_duration: number;
    output_channel_clipboard_also_outputs_to_notification: boolean;

    // Shell commands:
    shell_commands: ShellCommandsConfiguration;

    // Legacy:
    /** @deprecated Use shell_commands object instead of this array. From now on, this array can be used only for migrating old configuration to shell_commands.*/
    commands?: string[];
}

export const DEFAULT_SETTINGS: ShellCommandsPluginSettings = {

    // Common:
    settings_version: "prior-to-0.7.0", // This will be substituted by ShellCommandsPlugin.saveSettings() when the settings are saved.
    debug: false,

    // Variables:
    preview_variables_in_command_palette: true,
    show_autocomplete_menu: true,

    // Operating systems and shells:
    working_directory: "",
    default_shells: {},

    // Output:
    error_message_duration: 20,
    notification_message_duration: 10,
    output_channel_clipboard_also_outputs_to_notification: true,

    // Shell commands:
    shell_commands: {},
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