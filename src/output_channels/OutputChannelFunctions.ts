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

import SC_Plugin from "../main";
import {OutputChannel_Notification} from "./OutputChannel_Notification";
import {OutputChannel, OutputChannels} from "./OutputChannel";
import {OutputChannel_CurrentFileCaret} from "./OutputChannel_CurrentFileCaret";
import {OutputChannel_CurrentFileTop} from "./OutputChannel_CurrentFileTop";
import {
    OutputChannelCode,
    OutputChannelCodes,
    OutputHandlingMode,
    OutputStream,
} from "./OutputChannelCode";
import {OutputChannel_StatusBar} from "./OutputChannel_StatusBar";
import {OutputChannel_CurrentFileBottom} from "./OutputChannel_CurrentFileBottom";
import {OutputChannel_Clipboard} from "./OutputChannel_Clipboard";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {OutputChannel_Modal} from "./OutputChannel_Modal";
import {OutputChannel_OpenFiles} from "./OutputChannel_OpenFiles";

export interface OutputStreams {
    stdout?: string;
    stderr?: string;
}

const outputChannelClasses: {
    [key: string]: typeof OutputChannel;
} = {};

// Register output channels
registerOutputChannel("notification", OutputChannel_Notification);
registerOutputChannel("current-file-caret", OutputChannel_CurrentFileCaret);
registerOutputChannel("current-file-top", OutputChannel_CurrentFileTop);
registerOutputChannel("current-file-bottom", OutputChannel_CurrentFileBottom);
registerOutputChannel("open-files", OutputChannel_OpenFiles);
registerOutputChannel("status-bar", OutputChannel_StatusBar);
registerOutputChannel("clipboard", OutputChannel_Clipboard);
registerOutputChannel("modal", OutputChannel_Modal);

/**
 * This function is designed to be called after a 'Wait until finished' type of shell command finishes its execution.
 *
 * @param plugin
 * @param t_shell_command
 * @param shell_command_parsing_result
 * @param stdout
 * @param stderr
 * @param error_code TODO: Rename to exitCode everywhere in the codebase.
 * @param output_channels
 */
export function handleBufferedOutput(
        plugin: SC_Plugin,
        t_shell_command: TShellCommand,
        shell_command_parsing_result: ShellCommandParsingResult,
        stdout: string,
        stderr: string,
        error_code: number | null,
        output_channels: OutputChannelCodes
    ): void {
    // Terminology: Stream = outputs stream from a command, can be "stdout" or "stderr". Channel = a method for this application to present the output ot user, e.g. "notification".

    const shell_command_configuration = t_shell_command.getConfiguration(); // TODO: Refactor OutputChannels to use TShellCommand instead of the configuration objects directly.

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
    if (output_channels.stdout === output_channels.stderr) {
        // Stdout and stderr use the same channel.
        // Make one handling call.
        handle_stream(
            plugin,
            t_shell_command,
            shell_command_parsing_result,
            output_channels.stdout,
            output,
            error_code,
        );
    } else {
        // Stdout and stderr use different channels.
        // Make two handling calls.
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {
            const output_channel_name = output_channels[output_stream_name];
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

async function handle_stream(
        plugin: SC_Plugin,
        t_shell_command: TShellCommand,
        shell_command_parsing_result: ShellCommandParsingResult,
        output_channel_name: OutputChannelCode,
        output: OutputStreams,
        error_code: number|null
    ): Promise<void> {

    // Check if the output should be ignored
    if ("ignore" !== output_channel_name) {
        // The output should not be ignored.

        // Check that an output channel class exists
        if (undefined === outputChannelClasses[output_channel_name]) {
            throw new Error("No output channel class found for channel '" + output_channel_name + "'.");
        }

        // Instantiate the channel
        const outputChannel: OutputChannel = initializeOutputChannel(
            output_channel_name,
            plugin,
            t_shell_command,
            shell_command_parsing_result,
            "buffered",
            null, // "Buffered" output handling does not use a terminator, as the process has already ended.
        );

        // Perform handling the output
        await outputChannel.handleBuffered(output, error_code);
    }
}

export function startRealtimeOutputHandling(
        plugin: SC_Plugin,
        tShellCommand: TShellCommand,
        shellCommandParsingResult: ShellCommandParsingResult,
        outputChannelCodes: OutputChannelCodes,
        processTerminator: (() => void) | null,
    ): OutputChannels {

    const outputChannels: OutputChannels = {};

    // stdout
    if ("ignore" !== outputChannelCodes.stdout) {
        outputChannels.stdout = initializeOutputChannel(
            outputChannelCodes.stdout,
            plugin,
            tShellCommand,
            shellCommandParsingResult,
            "realtime",
            processTerminator,
        );
    }

    // stderr
    if ("ignore" !== outputChannelCodes.stderr) {
        if (outputChannelCodes.stderr === outputChannelCodes.stdout) {
            // stderr should use the same channel instance as stdout.
            outputChannels.stderr = outputChannels.stdout;
        } else {
            // stderr uses a different channel than stdout.
            outputChannels.stderr = initializeOutputChannel(
                outputChannelCodes.stderr,
                plugin,
                tShellCommand,
                shellCommandParsingResult,
                "realtime",
                processTerminator,
            );
        }
    }

    return outputChannels;
}

export function getOutputChannelsOptionList(output_stream: OutputStream) {
    const list: {
        [key: string]: string;
    } = {ignore: "Ignore"};
    for (const name in outputChannelClasses) {
        const channelClass: typeof OutputChannel = outputChannelClasses[name];
        // Check that the stream is suitable for the channel
        if (channelClass.acceptsOutputStream(output_stream)) {
            list[name] = channelClass.getTitle(output_stream);
        }
    }
    return list;
}

export function getOutputChannelClasses() {
    return outputChannelClasses;
}

export function initializeOutputChannel(
        channelCode: OutputChannelCode,
        plugin: SC_Plugin,
        tShellCommand: TShellCommand,
        shellCommandParsingResult: ShellCommandParsingResult,
        outputHandlingMode: OutputHandlingMode,
        processTerminator: (() => void) | null,
    ): OutputChannel {
    // @ts-ignore TODO: Find out how to tell TypeScript that a subclass is being instatiated instead of the abstract base class:
    return new outputChannelClasses[channelCode](
        plugin,
        tShellCommand,
        shellCommandParsingResult,
        outputHandlingMode,
        processTerminator,
    );
}

function registerOutputChannel(channelCode: OutputChannelCode, channelClass: typeof OutputChannel) {
    if (undefined !== outputChannelClasses[channelCode]) {
        throw new Error("OutputChannel named '" + channelCode + "' is already registered!");
    }
    outputChannelClasses[channelCode] = channelClass;
}