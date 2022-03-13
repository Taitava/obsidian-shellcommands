import {ShellCommandConfiguration} from "../settings/ShellCommandConfiguration";
import SC_Plugin from "../main";
import {OutputChannelDriver_Notification} from "./OutputChannelDriver_Notification";
import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputChannelDriver_CurrentFileCaret} from "./OutputChannelDriver_CurrentFileCaret";
import {OutputChannelDriver_CurrentFileTop} from "./OutputChannelDriver_CurrentFileTop";
import {OutputChannel, OutputStream} from "./OutputChannel";
import {OutputChannelDriver_StatusBar} from "./OutputChannelDriver_StatusBar";
import {OutputChannelDriver_CurrentFileBottom} from "./OutputChannelDriver_CurrentFileBottom";
import {OutputChannelDriver_Clipboard} from "./OutputChannelDriver_Clipboard";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {OutputChannelDriver_Modal} from "./OutputChannelDriver_Modal";
import {OutputChannelDriver_OpenFiles} from "./OutputChannelDriver_OpenFiles";

export interface OutputStreams {
    stdout?: string;
    stderr?: string;
}

const output_channel_drivers: {
    [key: string]: OutputChannelDriver;
} = {};

// Register output channel drivers
registerOutputChannelDriver("status-bar", new OutputChannelDriver_StatusBar());
registerOutputChannelDriver("notification", new OutputChannelDriver_Notification());
registerOutputChannelDriver("current-file-caret", new OutputChannelDriver_CurrentFileCaret());
registerOutputChannelDriver("current-file-top", new OutputChannelDriver_CurrentFileTop());
registerOutputChannelDriver("current-file-bottom", new OutputChannelDriver_CurrentFileBottom());
registerOutputChannelDriver("open-files", new OutputChannelDriver_OpenFiles());
registerOutputChannelDriver("clipboard", new OutputChannelDriver_Clipboard());
registerOutputChannelDriver("modal", new OutputChannelDriver_Modal());

export function handleShellCommandOutput(plugin: SC_Plugin, t_shell_command: TShellCommand, shell_command_parsing_result: ShellCommandParsingResult, stdout: string, stderr: string, error_code: number | null) {
    // Terminology: Stream = outputs stream from a command, can be "stdout" or "stderr". Channel = a method for this application to present the output ot user, e.g. "notification".

    const shell_command_configuration = t_shell_command.getConfiguration(); // TODO: Refactor OutputChannelDrivers to use TShellCommand instead of the configuration objects directly.

    // Insert stdout and stderr to an object in a correct order
    let output: OutputStreams = {};
    if (stdout.length && stderr.length) {
        // Both stdout and stderr have content
        // Decide the output order == Find out which data stream should be processed first, stdout or stderr.
        switch (shell_command_configuration.output_channel_order) {
            case "stdout-first":
                output = {
                    stdout: stdout,
                    stderr: stderr,
                };
                break;
            case "stderr-first":
                output = {
                    stderr: stderr,
                    stdout: stdout,
                };
                break;
        }
    } else if (stdout.length) {
        // Only stdout has content
        output = {
            stdout: stdout,
        };
    } else if (stderr.length) {
        // Only stderr has content
        output = {
            stderr: stderr,
        };
    } else {
        // Neither stdout nor stderr have content
        // Provide empty output, some output channels will process it, while other will just ignore it.
        output = {
            "stdout": "",
        };
    }

    // Should stderr be processed same time with stdout?
    if (shell_command_configuration.output_channels.stdout === shell_command_configuration.output_channels.stderr) {
        // Stdout and stderr use the same channel.
        // Make one handling call.
        handle_stream(
            plugin,
            t_shell_command,
            shell_command_parsing_result,
            shell_command_configuration.output_channels.stdout,
            output,
            error_code,
        );
    } else {
        // Stdout and stderr use different channels.
        // Make two handling calls.
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {
            const output_channel_name = shell_command_configuration.output_channels[output_stream_name];
            const output_message = output[output_stream_name];
            const separated_output: OutputStreams = {};
            separated_output[output_stream_name] = output_message;
            handle_stream(
                plugin,
                t_shell_command,
                shell_command_parsing_result,
                output_channel_name,
                separated_output,
                error_code,
            );
        }

    }
}

function handle_stream(
        plugin: SC_Plugin,
        t_shell_command: TShellCommand,
        shell_command_parsing_result: ShellCommandParsingResult,
        output_channel_name: OutputChannel,
        output: OutputStreams,
        error_code: number|null
    ) {

    // Check if the output should be ignored
    if ("ignore" !== output_channel_name) {
        // The output should not be ignored.

        // Check that an output driver exists
        if (undefined === output_channel_drivers[output_channel_name]) {
            throw new Error("No output driver found for channel '" + output_channel_name + "'.");
        }
        const driver: OutputChannelDriver = output_channel_drivers[output_channel_name];

        // Perform handling the output
        driver.initialize(plugin, t_shell_command, shell_command_parsing_result);
        driver.handle(output, error_code);
    }
}

export function getOutputChannelDriversOptionList(output_stream: OutputStream) {
    const list: {
        [key: string]: string;
    } = {ignore: "Ignore"};
    for (const name in output_channel_drivers) {
        const output_channel_driver: any = output_channel_drivers[name];
        // Check that the stream is suitable for the channel
        if (output_channel_driver.acceptsOutputStream(output_stream)) {
            list[name] = output_channel_driver.getTitle(output_stream);
        }
    }
    return list;
}

export function getOutputChannelDrivers() {
    return output_channel_drivers;
}

function registerOutputChannelDriver(name: OutputChannel, driver: OutputChannelDriver) {
    if (undefined !== output_channel_drivers[name]) {
        throw new Error("OutputChannelDriver named '" + name + "' is already registered!");
    }
    output_channel_drivers[name] = driver;
}