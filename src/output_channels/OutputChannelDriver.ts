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
import {
    OutputHandlingMode,
    OutputStream,
} from "./OutputChannelCode";
import {debugLog} from "../Debug";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {joinObjectProperties} from "../Common";
import {Variable_Output} from "../variables/Variable_Output";
import {parseVariables} from "../variables/parseVariables";
import {VariableSet} from "../variables/loadVariables";

/**
 * TODO: Rename the class. Remove 'Driver' from the class name. So: OutputChannelDriver --> OutputChannel. Also rename all variables in the whole codebase that contain the word 'driver'. Before renaming the class, need to Rename OutputChannel _type_ to something else. Perhaps OutputChannelCode?
 */
export abstract class OutputChannelDriver {

    // Class specific properties
    /**
     * Human readable name, used in settings.
     */
    protected static readonly title: string;
    protected static readonly accepted_output_streams: OutputStream[] = ["stdout", "stderr"];
    protected static readonly accepts_empty_output: boolean = false;

    /**
     * Determines if the output channel wants to handle a unified output or not. If yes, this property should define a
     * delimiter string that will be used as a glue between different output streams.
     *
     * @protected
     */
    protected static readonly combine_output_streams: false | string = false;

    /**
     * Used in OutputModal to redirect output based on hotkeys. If this is undefined, then the output channel is completely
     * excluded from OutputModal.
     */
    public static readonly hotkey_letter: string = undefined;

    /**
     * Can be overridden in child classes in order to vary the title depending on output_stream.
     * @param output_stream
     */
    public static getTitle(output_stream: OutputStream) {
        return this.title;
    }

    // Instance specific properties
    protected app: App;

    public constructor(
        protected plugin: SC_Plugin,
        protected t_shell_command: TShellCommand,
        protected shell_command_parsing_result: ShellCommandParsingResult,
        protected outputHandlingMode: OutputHandlingMode,
    ) {
        this.app = plugin.app;
    }

    /**
     * @param output Subclasses should define this as string, if they enable 'combine_output_streams'. Otherwise, they should define this as OutputStreams.
     * @param error_code
     * @protected
     */
    protected abstract _handleBuffered(output: OutputStreams | string, error_code: number | null): void;

    public async handleBuffered(output: OutputStreams, error_code: number | null): Promise<void> {
        this.requireHandlingMode("buffered");

        // Qualify output
        if (OutputChannelDriver.isOutputEmpty(output)) {
            // The output is empty
            if (!this.static().accepts_empty_output) {
                // This OutputChannelDriver does not accept empty output, i.e. empty output should be just ignored.
                debugLog(this.constructor.name + ".handleBuffered(): Ignoring empty output.");
                return;
            }
        }
        debugLog(this.constructor.name + ".handleBuffered(): Handling output...");

        // Output is ok.
        // Handle it.
        this._handleBuffered(await this.prepare_output(output), error_code);
        debugLog("Output handling is done.")
    }

    public async handleRealtime(outputStreamName: OutputStream, outputContent: string) {
        this.requireHandlingMode("realtime");

        // Qualify output
        if ("" === outputContent) {
            // The output is empty
            if (!this.static().accepts_empty_output) {
                // This OutputChannelDriver does not accept empty output, i.e. empty output should be just ignored.
                debugLog(this.constructor.name + ".handleRealtime(): Ignoring empty output.");
                return;
            }
        }
        debugLog(this.constructor.name + ".handleRealtime(): Handling output...");

        // Output is ok.

        // Wrap output (if needed)
        const wrappedOutput = await this.wrapOutput(outputStreamName, outputContent);

        // Determine data format. TODO: Change this so that subclasses will have a _handleRealtime() method that always takes a string.
        if (this.static().combine_output_streams) {
            // Handle as string
            this._handleBuffered(wrappedOutput, null);
        } else {
            // Handle as an object
            const outputContentInObject: OutputStreams = {};
            outputContentInObject[outputStreamName] = outputContent;
            this._handleBuffered(outputContentInObject, null);
        }

        debugLog("Output handling is done.");
    }

    private requireHandlingMode(requiredMode: OutputHandlingMode) {
        if (this.outputHandlingMode !== requiredMode) {
            throw new Error("this.outputHandlingMode must be '"+requiredMode+"'.");
        }
    }

    public static acceptsOutputStream(output_stream: OutputStream) {
        return this.accepted_output_streams.contains(output_stream);
    }

    /**
     * Does the following preparations:
     *  - Combines output streams (if wanted by the OutputChannelDriver).
     *  - Wraps output (if defined in shell command configuration).
     * @param output_streams
     * @private
     */
    private async prepare_output(output_streams: OutputStreams): Promise<OutputStreams | string> {
        const wrap_outputs_separately = async () => {
            const wrapped_output_streams: OutputStreams = {};
            let output_stream_name: OutputStream;
            for (output_stream_name in output_streams) {
                wrapped_output_streams[output_stream_name] = await this.wrapOutput(
                    output_stream_name,
                    output_streams[output_stream_name],
                );
            }
            return wrapped_output_streams;
        };

        // Check if outputs should be combined.
        const combineOutputStreams = this.static().combine_output_streams;
        if (combineOutputStreams) {
            // Combine output strings into a single string.

            // Can output wrapping be combined?
            if (this.t_shell_command.isOutputWrapperStdoutSameAsStderr()) {
                // Output wrapping can be combined.
                return await this.wrapOutput(
                    "stdout",
                    joinObjectProperties(output_streams, combineOutputStreams), // Use combineOutputStreams as a glue string.
                );
            } else {
                // Output wrapping needs to be done separately.
                const wrapped_output_streams = await wrap_outputs_separately();
                return joinObjectProperties(wrapped_output_streams, combineOutputStreams); // Use combineOutputStreams as a glue string.
            }

        } else {
            // Do not combine, handle each stream separately
            return await wrap_outputs_separately();
        }
    }

    /**
     * Surrounds the given output text with an output wrapper. If no output wrapper is defined, returns the original
     * output text without any modifications.
     */
    private async wrapOutput(output_stream: OutputStream, output_content: string): Promise<string> {

        // Get preparsed output wrapper content. It has all other variables parsed, except {{output}}.
        const parsing_result_key: keyof ShellCommandParsingResult = "output_wrapper_"+output_stream as keyof ShellCommandParsingResult;
        const output_wrapper_content = this.shell_command_parsing_result[parsing_result_key] as string | undefined;

        // Check if output wrapper content exists.
        if (undefined === output_wrapper_content) {
            // No OutputWrapper is defined for this shell command.
            // Return the output text without modifications.
            debugLog("Output wrapping: No wrapper is defined for '" + output_stream + "'.");
            return output_content;
        }

        // Parse the {{output}} variable
        const output_variable = new Variable_Output(this.plugin, output_content);
        const parsing_result = await parseVariables(
            this.plugin,
            output_wrapper_content,
            null, // No shell anymore, so no need for escaping.
            this.t_shell_command,
            null, // No support for {{event_*}} variables is needed, because they are already parsed in output_wrapper_content. This phase only parses {{output}} variable, nothing else.
            new VariableSet([output_variable]), // Only parse the {{output}} variable.
        );

        // Inspect the parsing result. It should always succeed, as the {{output}} variable should not give any errors.
        if (parsing_result.succeeded) {
            // Succeeded.
            debugLog("Output wrapping: Wrapping " + output_stream + " succeeded.");
            return parsing_result.parsed_content;
        } else {
            // Failed for some reason.
            this.plugin.newError("Output wrapping failed, see error(s) below.");
            this.plugin.newErrors(parsing_result.error_messages);
            throw new Error("Output wrapping failed: Parsing {{output}} resulted in error(s): " + parsing_result.error_messages.join(" "));
        }
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

    public static() {
        return this.constructor as typeof OutputChannelDriver;
    }
}

export interface OutputChannelDrivers {
    stdout?: OutputChannelDriver,
    stderr?: OutputChannelDriver,
}