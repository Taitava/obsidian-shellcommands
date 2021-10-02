import {OutputChannel, OutputChannelOrder} from "../output_channels/OutputChannel";

export interface ShellCommandsConfiguration {
    [key: string]: ShellCommandConfiguration;
}

export interface ShellCommandConfiguration {
    shell_command: string;
    alias: string;
    confirm_execution: boolean;
    ignore_error_codes: number[];
    output_channels: {
        stdout: OutputChannel,
        stderr: OutputChannel,
    },
    output_channel_order: OutputChannelOrder;
}

export function newShellCommandConfiguration(shell_command: string = ""): ShellCommandConfiguration {
    return {
        shell_command: shell_command,
        alias: "",
        confirm_execution: false,
        ignore_error_codes: [],
        output_channels: {
            stdout: "ignore",
            stderr: "notification",
        },
        output_channel_order: "stdout-first",
    }
}