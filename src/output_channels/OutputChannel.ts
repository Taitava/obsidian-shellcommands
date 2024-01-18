/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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
import {OutputStreams} from "./OutputChannelFunctions";
import {
    OutputHandlerApplicableConfiguration,
    OutputHandlerCode,
    OutputHandlerConfiguration,
    OutputHandlerConfigurations,
    OutputHandlingMode,
    OutputStream,
} from "./OutputHandlerCode";
import {debugLog} from "../Debug";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {joinObjectProperties} from "../Common";
import {Variable_Output} from "../variables/Variable_Output";
import {parseVariables} from "../variables/parseVariables";
import {VariableSet} from "../variables/loadVariables";
import {default as AnsiUp} from "ansi_up";

/**
 * TODO: Rename to OutputHandler.
 */
export abstract class OutputChannel {

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
    public static readonly hotkey_letter: string | undefined = undefined;
    
    protected static readonly applicableConfiguration: OutputHandlerApplicableConfiguration = {
        /**
         * Whether to allow convertAnsiCodeToHtmlIfAllowed() to do conversion. Note that even if this is true, user
         * configuration may disable it.
         *
         * @see convertAnsiCodeToHtmlIfEnabled
         * @private
         */
        convert_ansi_code: true,
    };

    /**
     * Can be overridden in child classes in order to vary the title depending on output_stream.
     * @param output_stream
     */
    public static getTitle(output_stream: OutputStream) {
        return this.title;
    }

    // Instance specific properties
    protected app: App;

    private ansiToHtmlConverter: AnsiUp;

    /**
     * @param plugin
     * @param t_shell_command
     * @param shell_command_parsing_result
     * @param outputHandlingMode
     * @param processTerminator Will be called if user decides to end the process. Set to null if the process has already ended.
     */
    public constructor(
        protected plugin: SC_Plugin,
        protected t_shell_command: TShellCommand,
        protected shell_command_parsing_result: ShellCommandParsingResult,
        protected outputHandlingMode: OutputHandlingMode,
        protected processTerminator: (() => void) | null,
    ) {
        this.app = plugin.app;
        this.initializeAnsiToHtmlConverter();
        this.initialize();
    }

    /**
     * Sub classes can do here initializations that are common to both handleBuffered() and handleRealtime().
     *
     * Inits could be done in contructor(), too, but this is cleaner - no need to deal with parameters and no need for a super()
     * call.
     *
     * @protected
     */
    protected initialize() {
        // Do nothing by default.
    }

    /**
     * @param output Subclasses should define this as string, if they enable 'combine_output_streams'. Otherwise, they should define this as OutputStreams.
     * @param error_code
     * @protected
     */
    protected abstract _handleBuffered(output: OutputStreams | string, error_code: number | null): Promise<void>;

    public async handleBuffered(output: OutputStreams, error_code: number | null, enableOutputWrapping = true): Promise<void> {
        this.requireHandlingMode("buffered");

        // Qualify output
        if (OutputChannel.isOutputEmpty(output)) {
            // The output is empty
            if (!this.static().accepts_empty_output) {
                // This OutputChannel does not accept empty output, i.e. empty output should be just ignored.
                debugLog(this.constructor.name + ".handleBuffered(): Ignoring empty output.");
                return;
            }
        }
        debugLog(this.constructor.name + ".handleBuffered(): Handling output...");

        // Output is ok.
        // Apply ANSI conversion, if enabled.
        let outputStreamName: OutputStream;
        for (outputStreamName in output) {
            output[outputStreamName] = this.convertAnsiCodeToHtmlIfEnabled(output[outputStreamName] as string, outputStreamName);
        }
        
        // Handle output.
        await this._handleBuffered(await this.prepare_output(output, enableOutputWrapping), error_code);
        debugLog("Output handling is done.");
    }

    protected abstract _handleRealtime(outputContent: string, outputStreamName: OutputStream): Promise<void>;

    /**
     * @param outputStreamName
     * @param outputContent
     * @param enableOutputWrapping No caller actually sets this to false at the moment, unlike the handleBuffered() method's counterpart. But have this just in case.
     */
    public async handleRealtime(outputStreamName: OutputStream, outputContent: string, enableOutputWrapping = true) {
        this.requireHandlingMode("realtime");

        // Qualify output
        if ("" === outputContent) {
            // The output is empty
            if (!this.static().accepts_empty_output) {
                // This OutputChannel does not accept empty output, i.e. empty output should be just ignored.
                debugLog(this.constructor.name + ".handleRealtime(): Ignoring empty output.");
                return;
            }
        }
        debugLog(this.constructor.name + ".handleRealtime(): Handling output...");

        // Output is ok.

        // If allowed, wrap the output with output wrapper text.
        if (enableOutputWrapping) {
            // Wrap output (but only if a wrapper is defined)
            outputContent = await this.wrapOutput(outputStreamName, outputContent);
        }
        
        // Apply ANSI conversion, if enabled.
        outputContent = this.convertAnsiCodeToHtmlIfEnabled(outputContent, outputStreamName);

        // Handle output.
        await this._handleRealtime(outputContent, outputStreamName);

        debugLog("Output handling is done.");
    }

    protected _endRealtime(exitCode: number): void {
        // Do nothing by default.
    }

    /**
     * When a shell command is executed in "realtime" mode, a separate ending call should be made in order to pass an
     * exit code to the OutputChannel. Some OutputChannels display the code to user, but most do not.
     *
     * @param exitCode
     */
    public endRealtime(exitCode: number) {
        this.requireHandlingMode("realtime");

        this._endRealtime(exitCode);
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
     *  - Combines output streams (if wanted by the OutputChannel).
     *  - Wraps output (if defined in shell command configuration).
     * @param output_streams
     * @param enableOutputWrapping
     * @private
     */
    private async prepare_output(output_streams: OutputStreams, enableOutputWrapping: boolean): Promise<OutputStreams | string> {
        const wrapOutputIfEnabled = async (outputStreamName: OutputStream, outputContent: string) => {
            if (enableOutputWrapping) {
                // Wrap output content.
                return await this.wrapOutput(outputStreamName, outputContent);
            } else {
                // Wrapping is disabled, return unmodified output content.
                return outputContent;
            }
        };

        const wrap_outputs_separately = async () => {
            const wrapped_output_streams: OutputStreams = {};
            let output_stream_name: OutputStream;
            for (output_stream_name in output_streams) {
                wrapped_output_streams[output_stream_name] = await wrapOutputIfEnabled(
                    output_stream_name,
                    output_streams[output_stream_name] as string, // as string = output content always exists because the key came from for...in.
                );
            }
            return wrapped_output_streams;
        };

        // Check if outputs should be combined.
        const combineOutputStreams = this.static().combine_output_streams; // Can be an empty string "", and outputs should still be joined.
        if (typeof combineOutputStreams === "string") {
            // Combine output strings into a single string.

            // Can output wrapping be combined?
            if (this.t_shell_command.isOutputWrapperStdoutSameAsStderr()) {
                // Output wrapping can be combined.
                return await wrapOutputIfEnabled(
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
            this.t_shell_command.getShell(), // Even though the shell won't get executed anymore, possible file path related variables need it for directory path formatting.
            false, // No shell is executed anymore, so no need for escaping.
            this.t_shell_command,
            null, // No support for {{event_*}} variables is needed, because they are already parsed in output_wrapper_content. This phase only parses {{output}} variable, nothing else.
            new VariableSet([output_variable]), // Only parse the {{output}} variable.
        );

        // Inspect the parsing result. It should always succeed, as the {{output}} variable should not give any errors.
        if (parsing_result.succeeded) {
            // Succeeded.
            debugLog("Output wrapping: Wrapping " + output_stream + " succeeded.");
            return parsing_result.parsed_content as string;
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

    /**
     * Output can contain font styles, colors and links in ANSI code format. This method defines a converter for ANSI code.
     *
     * @see https://en.wikipedia.org/wiki/ANSI_escape_code
     * @private
     */
    private initializeAnsiToHtmlConverter(): void {
        this.ansiToHtmlConverter = new AnsiUp;
        // this.ansiToHtmlConverter.use_classes = true; // Use CSS classes instead of style="" attributes. Commented out, because it doesn't substitute all style="" attributes (e.g. true-colors are still defined using style="", and so al bolds, italics etc.). TODO: If wanted, can later make a pull request to the AnsiUp library that would substitute all style="" attributes with classes (except true-colors).
        this.ansiToHtmlConverter.escape_html = false; // Do not escape possibly outputted HTML. // TODO: Create a setting for this. Escaping html in the output might be handy. Or maybe it should escape also Markdown special characters (so would be done elsewhere)?
        Object.assign(this.ansiToHtmlConverter.url_whitelist, {
            "obsidian": 1, // Whitelist obsidian:// protocol in possible links. This is needed if the converted ANSI code contains hyperlinks.
            // https:// and http:// are already whitelisted.
        });
    }
    
    /**
     * Two thing can deny the ANSI conversion:
     *  1) OutputHandlerConfiguration
     *  2) An OutputChannel subclass. At least "Open files" denies it.
     * @param outputContent
     * @param outputStreamName
     * @protected
     */
    private convertAnsiCodeToHtmlIfEnabled(outputContent: string, outputStreamName: OutputStream): string {
        if (!this.static().applicableConfiguration.convert_ansi_code) {
            // A subclass has disabled the conversion.
            return outputContent;
        }
        const outputHandlerConfigurations: OutputHandlerConfigurations = this.t_shell_command.getOutputHandlers();
        if (outputHandlerConfigurations[outputStreamName].convert_ansi_code) {
            // Converting is allowed.
            return this.ansiToHtmlConverter.ansi_to_html(outputContent as string);
        } else {
            // user configuration has disabled the conversion.
            return outputContent;
        }
    }

    public static() {
        return this.constructor as typeof OutputChannel;
    }

    public static getDefaultConfiguration(outputChannelCode: OutputHandlerCode): OutputHandlerConfiguration {
        return {
            handler: outputChannelCode,
            convert_ansi_code: true,
        };
    }
}

export interface OutputChannels {
    stdout?: OutputChannel,
    stderr?: OutputChannel,
}