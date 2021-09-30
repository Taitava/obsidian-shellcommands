import {ShellCommandConfiguration} from "../settings/ShellCommandConfiguration";
import ShellCommandsPlugin from "../main";
import {OutputChannelDriver_Notification} from "./OutputChannelDriver_Notification";
import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputChannelDriver_CurrentFileCaret} from "./OutputChannelDriver_CurrentFileCaret";
import {OutputStream} from "./OutputChannel";
import {ExecException} from "child_process";

let output_channel_drivers:{
    [key: string]: OutputChannelDriver;
} = {};

// Register output channel drivers
registerOutputChannelDriver("notification", new OutputChannelDriver_Notification());
registerOutputChannelDriver("current-file-caret", new OutputChannelDriver_CurrentFileCaret());

export function handleShellCommandOutput(plugin: ShellCommandsPlugin, shell_command_configuration: ShellCommandConfiguration, stdout: string, stderr: string, error: ExecException|null) {
    let output_channels = shell_command_configuration.output_channels;

    // Terminology: Stream = outputs stream from a command, can be "stdout" or "stderr". Channel = a method for this application to present the output ot user, e.g. "notification".
    // Find out which data stream should be processed first, stdout or stderr.
    let output_stream_order: { // TODO: Ensure that the order can change
        "stdout": string,
        "stderr"?: string, // Can be omitted, if output is combined
    };
    let combined_output: string; // Only used if both streams are defined to use the same channel.
    switch (shell_command_configuration.output_channel_order) {
        case "stdout-first":
            output_stream_order = {
                stdout: stdout,
                stderr: stderr,
            };
            combined_output = stdout + stderr; // Only used if both streams are defined to use the same channel.
            break;
        case "stderr-first":
            output_stream_order = {
                stderr: stderr,
                stdout: stdout,
            }
            combined_output = stderr + stdout; // Only used if both streams are defined to use the same channel.
            break;
    }

    // Should stderr be combined to stdout?
    if (output_channels.stdout === output_channels.stderr) {
        // Stdout and stderr use the same channel.
        // Combine the streams
        output_stream_order = {
            stdout: combined_output
        };
    }

    // Direct output streams to output channels
    let output_stream_name: OutputStream;
    for (output_stream_name in output_stream_order) {
        let output_message = output_stream_order[output_stream_name];
        let output_channel_name = output_channels[output_stream_name];

        // Ensure that the output should not be ignored
        if ("ignore" !== output_channel_name) {
            // The output should not be ignored.

            // Check that an output driver exists
            if (undefined === output_channel_drivers[output_channel_name]) {
                throw new Error("No output driver found for channel '" + output_channel_name + "'.");
            }
            let driver: OutputChannelDriver = output_channel_drivers[output_channel_name];

            // Check that the output is not empty, or that the driver can handle empty outputs.
            if (output_message.length || driver.handles_empty_output) {
                // Perform handling the output
                driver.initialize(plugin);
                driver.handle(output_message, error);
            }

        }
    }



}

export function getOutputChannelDriversOptionList() {
    let list: {
        [key: string]: string;
    } = {ignore: "Ignore"};
    for (let name in output_channel_drivers) {
        list[name] = output_channel_drivers[name].title;
    }
    console.log(list);
    return list;
}

function registerOutputChannelDriver(name: string, driver: OutputChannelDriver) {
    if (undefined !== output_channel_drivers[name]) {
        throw new Error("OutputChannelDriver named '" + name + "' is already registered!");
    }
    output_channel_drivers[name] = driver;
}