// SETTINGS AND DEFAULT VALUES
import {ShellCommandsConfiguration} from "../../ShellCommandConfiguration";

export interface ShellCommandsPluginSettings {
    working_directory: string;
    preview_variables_in_command_palette: boolean;
    shell_commands: ShellCommandsConfiguration;
    error_message_duration: number;

    // Legacy:
    /** @deprecated Use shell_commands object instead of this array. From now on, this array can be used only for migrating old configuration to shell_commands.*/
    commands: string[];
}

export const DEFAULT_SETTINGS: ShellCommandsPluginSettings = {
    working_directory: "",
    preview_variables_in_command_palette: true,
    shell_commands: {},
    error_message_duration: 20,

    // Legacy:
    commands: [] // Deprecated, but must be present in the default values as long as migrating from commands to shell_commands is supported.
}