// SETTINGS AND DEFAULT VALUES
import {ShellCommandsConfiguration} from "./ShellCommandConfiguration";

export interface ShellCommandsPluginSettings {
    default_shell: IPlatformSpecificString;
    working_directory: string;
    preview_variables_in_command_palette: boolean;
    shell_commands: ShellCommandsConfiguration;
    error_message_duration: number;
    notification_message_duration: number;

    // Legacy:
    /** @deprecated Use shell_commands object instead of this array. From now on, this array can be used only for migrating old configuration to shell_commands.*/
    commands: string[];
}

export const DEFAULT_SETTINGS: ShellCommandsPluginSettings = {
    default_shell: {},
    working_directory: "",
    preview_variables_in_command_palette: true,
    shell_commands: {},
    error_message_duration: 20,
    notification_message_duration: 10,

    // Legacy:
    commands: [] // Deprecated, but must be present in the default values as long as migrating from commands to shell_commands is supported.
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
export type OperatingSystemName = "darwin" | "linux" | "win32";

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
