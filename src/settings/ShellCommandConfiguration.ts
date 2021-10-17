import {OutputChannel, OutputChannelOrder} from "../output_channels/OutputChannel";
import {IOperatingSystemSpecificString, IOperatingSystemSpecificStringWithDefault} from "./ShellCommandsPluginSettings";

export interface ShellCommandsConfiguration {
    [key: string]: ShellCommandConfiguration;
}

export interface ShellCommandConfiguration {
    shell_commands: IOperatingSystemSpecificStringWithDefault;
    shells: IOperatingSystemSpecificString;
    alias: string;
    confirm_execution: boolean;
    ignore_error_codes: number[];
    output_channels: {
        stdout: OutputChannel,
        stderr: OutputChannel,
    },
    output_channel_order: OutputChannelOrder;

    // LEGACY
    /** @deprecated Can only be used for migration. */
    shell_command: string;
}

export function newShellCommandConfiguration(shell_command: string = ""): ShellCommandConfiguration {
    return {
        shell_commands: {
            default: shell_command,
        },
        shells: {},
        alias: "",
        confirm_execution: false,
        ignore_error_codes: [],
        output_channels: {
            stdout: "ignore",
            stderr: "notification",
        },
        output_channel_order: "stdout-first",

        // LEGACY
        shell_command: null,
    }
}