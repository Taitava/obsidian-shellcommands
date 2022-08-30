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
import {App} from "obsidian";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";
import {debugLog} from "../Debug";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {joinObjectProperties} from "../Common";
import {OutputWrapper} from "../models/output_wrapper/OutputWrapper";

export abstract class OutputChannelDriver {
    /**
     * Human readable name, used in settings.
     */
    protected abstract readonly title: string;
    protected readonly accepted_output_streams: OutputStream[] = ["stdout", "stderr"];

    protected plugin: SC_Plugin;
    protected app: App;
    protected shell_command_parsing_result: ShellCommandParsingResult;
    protected t_shell_command: TShellCommand;
    protected accepts_empty_output = false;

    /**
     * Determines if the output channel wants to handle a unified output or not. If yes, this property should define a
     * delimiter string that will be used as a glue between different output streams.
     *
     * @protected
     */
    protected combine_output_streams: false | string = false;

    /**
     * Used in OutputModal to redirect output based on hotkeys. If this is undefined, then the output channel is completely
     * excluded from OutputModal.
     */
    public hotkey_letter: string = undefined;

    /**
     * Can be overridden in child classes in order to vary the title depending on output_stream.
     * @param output_stream
     */
    public getTitle(output_stream: OutputStream) {
        return this.title;
    }

    public initialize(plugin: SC_Plugin, t_shell_command: TShellCommand, shell_command_parsing_result: ShellCommandParsingResult) {
        this.plugin = plugin;
        this.app = plugin.app;
        this.t_shell_command = t_shell_command;
        this.shell_command_parsing_result = shell_command_parsing_result;
    }

    /**
     * @param output Subclasses should define this as string, if they enable 'combine_output_streams'. Otherwise, they should define this as OutputStreams.
     * @param error_code
     * @protected
     */
    protected abstract _handle(output: OutputStreams | string, error_code: number | null): void;

    public handle(output: OutputStreams, error_code: number | null): void {
        // Qualify output
        if (OutputChannelDriver.isOutputEmpty(output)) {
            // The output is empty
            if (!this.accepts_empty_output) {
                // This OutputChannelDriver does not accept empty output, i.e. empty output should be just ignored.
                debugLog(this.constructor.name + ": Ignoring empty output.");
                return;
            }
        }
        debugLog(this.constructor.name + ": Handling output...");

        // Output is ok.
        // Handle it.
        this._handle(this.prepare_output(output), error_code);
        debugLog("Output handling is done.")
    }

    public acceptsOutputStream(output_stream: OutputStream) {
        return this.accepted_output_streams.contains(output_stream);
    }

    /**
     * Does the following preparations:
     *  - Combines output streams (if wanted by the OutputChannelDriver).
     *  - Wraps output (if defined in shell command configuration).
     * @param output_streams
     * @private
     */
    private prepare_output(output_streams: OutputStreams): OutputStreams | string {
        const wrap_outputs_separately = () => {
            const wrapped_output_streams: OutputStreams = {};
            let output_stream_name: OutputStream;
            for (output_stream_name in output_streams) {
                wrapped_output_streams[output_stream_name] = this.wrapOutput(
                    output_stream_name,
                    output_streams[output_stream_name],
                    this.t_shell_command,
                );
            }
            return wrapped_output_streams;
        };

        // Check if outputs should be combined.
        if (this.combine_output_streams) {
            // Combine output strings into a single string.

            // Can output wrapping be combined?
            if (this.t_shell_command.isOutputWrapperStdoutSameAsStderr()) {
                // Output wrapping can be combined.
                return this.wrapOutput(
                    "stdout",
                    joinObjectProperties(output_streams, this.combine_output_streams), // Use this.combine_output_streams as a glue string.
                    this.t_shell_command,
                );
            } else {
                // Output wrapping needs to be done separately.
                const wrapped_output_streams = wrap_outputs_separately();
                return joinObjectProperties(wrapped_output_streams, this.combine_output_streams); // Use this.combine_output_streams as a glue string.
            }

        } else {
            // Do not combine, handle each stream separately
            return wrap_outputs_separately();
        }
    }

    /**
     * Surrounds the given output text with an output wrapper. If no output wrapper is defined, returns the original
     * output text without any modifications.
     */
    private wrapOutput(output_stream: OutputStream, output_content: string, t_shell_command: TShellCommand): string {
        const output_wrapper: OutputWrapper = t_shell_command.getOutputWrapper(output_stream);
        if (null === output_wrapper) {
            // No OutputWrapper is defined for this shell command.
            // Return the output text without modifications.
            return output_content;
        }
        return output_wrapper.wrapOutput(output_content, t_shell_command);
    }

    /**
     * Can be moved to a global function isOutputStreamEmpty() if needed.
     * @param output
     * @private
     */
    private static isOutputEmpty(output: OutputStreams) {
        if (undefined !== output.stderr) {
            return false;
        }
        return undefined === output.stdout || "" === output.stdout;
    }
}