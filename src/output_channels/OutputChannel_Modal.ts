/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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

import {
    OutputChannel,
} from "./OutputChannel";
import {
    getOutputChannelClasses,
    initializeOutputChannel,
    OutputStreams,
} from "./OutputChannelFunctions";
import {Setting, TextAreaComponent} from "obsidian";
import {
    OutputChannelCode,
    OutputStream,
} from "./OutputChannelCode";
import SC_Plugin from "../main";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {SC_Modal} from "../SC_Modal";
import {getSelectionFromTextarea} from "../Common";
import {CmdOrCtrl} from "../Hotkeys";
import {EOL} from "os";

export class OutputChannel_Modal extends OutputChannel {
    protected static readonly title = "Ask after execution";

    private modal: OutputModal;

    protected initialize(): void {
        // Initialize a modal (but don't open yet)
        this.modal = new OutputModal(
            this.plugin,
            this.t_shell_command,
            this.shell_command_parsing_result,
            this.processTerminator,
        );
    }

    protected async _handleBuffered(outputs: OutputStreams, error_code: number | null): Promise<void> {
        // Pass outputs to modal
        this.modal.setOutputContents(outputs);

        // Define a possible error code to be shown on the modal.
        if (error_code !== null) {
            this.modal.setExitCode(error_code);
        }

        // Done
        this.modal.open();
    }

    protected async _handleRealtime(outputContent: string, outputStreamName: OutputStream): Promise<void> {
        this.modal.addOutputContent(outputStreamName, outputContent);
        if (!this.modal.isOpen()) {
            this.modal.open();
        }
    }

    /**
     * @param exitCode Can be null if user terminated the process by clicking a button. In other places exitCode can be null if process is still running, but here that cannot be the case.
     *
     * @protected
     */
    protected _endRealtime(exitCode: number | null) {
        // Delete terminator button as the process is already ended.
        this.modal.removeProcessTerminatorButton();

        // Pass exitCode to the modal
        this.modal.setExitCode(exitCode);
    }

}

class OutputModal extends SC_Modal {

    private readonly t_shell_command: TShellCommand;
    private readonly shell_command_parsing_result: ShellCommandParsingResult;
    private exit_code: number | null = null; // TODO: Think about changing the logic: exit code could be undefined when it's not received, and null when a user has terminated the execution. The change needs to be done in the whole plugin, although I only wrote about it in this OutputModal class.

    // Fields and HTML elements
    private outputFieldsContainer: HTMLElement;
    private outputFields: {[key in OutputStream]: Setting};
    private exitCodeElement: HTMLElement;
    private processTerminatorButtonContainer: HTMLElement;

    constructor(
        plugin: SC_Plugin,
        t_shell_command: TShellCommand,
        shell_command_parsing_result: ShellCommandParsingResult,
        private processTerminator: (() => void) | null,
    ) {
        super(plugin);

        this.t_shell_command = t_shell_command;
        this.shell_command_parsing_result = shell_command_parsing_result;

        this.createOutputFields();
    }

    /**
     * Called when doing "buffered" output handling.
     *
     * @param outputs
     */
    public setOutputContents(outputs: OutputStreams) {
        Object.getOwnPropertyNames(outputs).forEach((outputStreamName: OutputStream) => {
            const outputField: Setting = this.outputFields[outputStreamName];

            // Set field value
            const textareaComponent = outputField.components.first() as TextAreaComponent;
            const outputContent = outputs[outputStreamName];
            textareaComponent.setValue(outputContent as string); // as string = outputContent is not undefined because of the .forEach() loop.

            // Make field visible (if it's not already)
            outputField.settingEl.matchParent(".SC-hide")?.removeClass("SC-hide");
        });
    }

    /**
     * Called when doing "realtime" output handling.
     *
     * @param outputStreamName
     * @param outputContent
     */
    public addOutputContent(outputStreamName: OutputStream, outputContent: string) {
        const outputField: Setting = this.outputFields[outputStreamName];

        // Update field value
        const textareaComponent = outputField.components.first() as TextAreaComponent;
        textareaComponent.setValue(textareaComponent.getValue() + outputContent);

        // Make field visible (if it's not already)
        outputField.settingEl.matchParent(".SC-hide")?.removeClass("SC-hide");
    }

    public onOpen(): void {
        super.onOpen();
        this.modalEl.addClass("SC-modal-output");

        // Heading
        const heading = this.shell_command_parsing_result.alias;
        this.titleEl.innerText = heading ? heading : "Shell command output";  // TODO: Use this.setTitle() instead.

        // Shell command preview
        this.modalEl.createEl("pre", {text: this.shell_command_parsing_result.shell_command, attr: {class: "SC-no-margin SC-wrappable"}}); // no margin so that exit code will be close.

        // Container for terminating button and exit code
        const processResultContainer = this.modalEl.createDiv();

        // 'Request to terminate the process' icon button
        if (this.processTerminator) {
            this.processTerminatorButtonContainer = processResultContainer.createEl('span');
            this.plugin.createRequestTerminatingButton(this.processTerminatorButtonContainer, this.processTerminator);
        }

        // Exit code (put on same line with process terminator button, if exists)
        this.exitCodeElement = processResultContainer.createEl("small", {text: "Executing...", attr: {style: "font-weight: bold;"}}); // Show "Executing..." before an actual exit code is received.
        if (this.exit_code !== null) {
            this.displayExitCode();
        }

        // Output fields
        this.modalEl.insertAdjacentElement("beforeend",this.outputFieldsContainer);

        // Focus on the first output field
        this.focusFirstField();

        // A tip about selecting text.
        this.modalEl.createDiv({
            text: "Tip! If you select something, only the selected text will be used.",
            attr: {class: "setting-item-description" /* A CSS class defined by Obsidian. */},
        });
    }

    private createOutputFields() {
        // Create a parent-less container. onOpen() will place it in the correct place.
        this.outputFieldsContainer = document.createElement('div');

        // Create field containers in correct order
        let stdoutFieldContainer: HTMLDivElement;
        let stderrFieldContainer: HTMLDivElement;
        switch (this.t_shell_command.getOutputChannelOrder()) {
            case "stdout-first": {
                stdoutFieldContainer = this.outputFieldsContainer.createDiv();
                stderrFieldContainer = this.outputFieldsContainer.createDiv();
                break;
            }
            case "stderr-first": {
                stderrFieldContainer = this.outputFieldsContainer.createDiv();
                stdoutFieldContainer = this.outputFieldsContainer.createDiv();
                break;
            }
        }

        // Create fields
        this.outputFields = {
            stdout: this.createOutputField("stdout", stdoutFieldContainer),
            stderr: this.createOutputField("stderr", stderrFieldContainer),
        };
        
        // Define hotkeys.
        const outputChannelClasses: {[p: string]: typeof OutputChannel} = getOutputChannelClasses();
        for (const outputChannelName of Object.getOwnPropertyNames(outputChannelClasses) as OutputChannelCode[]) {
            const outputChannelClass = outputChannelClasses[outputChannelName];
            // Ensure this channel is not excluded by checking that is has a hotkey defined.
            if (outputChannelClass.hotkey_letter) {
                const hotkeyHandler = () => {
                    const activeTextarea = this.getActiveTextarea();
                    if (activeTextarea) {
                        this.redirectOutput(
                            outputChannelName,
                            activeTextarea.outputStreamName,
                            activeTextarea.textarea,
                        );
                    }
                };
    
                // 1. hotkey: Ctrl/Cmd + number: handle output.
                this.scope.register(["Ctrl"], outputChannelClass.hotkey_letter, hotkeyHandler);
            
                // 2. hotkey: Ctrl/Cmd + Shift + number: handle output and close the modal.
                this.scope.register(["Ctrl", "Shift"], outputChannelClass.hotkey_letter, () => {
                    hotkeyHandler();
                    this.close();
                });
            }
        }
        

        // Hide the fields' containers at the beginning. They will be shown when content is added.
        stdoutFieldContainer.addClass("SC-hide");
        stderrFieldContainer.addClass("SC-hide");
    }

    private createOutputField(output_stream: OutputStream, containerElement: HTMLElement) {

        containerElement.createEl("hr", {attr: {class: "SC-no-margin"}});

        // Output stream name
        new Setting(containerElement)
            .setName(output_stream)
            .setHeading()
            .setClass("SC-no-bottom-border")
        ;

        // Textarea
        const textarea_setting = new Setting(containerElement)
            .addTextArea(() => {}) // No need to do anything, but the method requires a callback.
        ;
        textarea_setting.infoEl.addClass("SC-hide"); // Make room for the textarea by hiding the left column.
        textarea_setting.settingEl.addClass("SC-output-channel-modal-textarea-container", "SC-no-top-border");

        // Add controls for redirecting the output to another channel.
        const redirect_setting = new Setting(containerElement)
            .setDesc("Redirect:")
            .setClass("SC-no-top-border")
            .setClass("SC-output-channel-modal-redirection-buttons-container") // I think this calls actually HTMLDivElement.addClass(), so it should not override the previous .setClass().
        ;
        const outputChannels = getOutputChannelClasses();
        Object.getOwnPropertyNames(outputChannels).forEach((output_channel_name: OutputChannelCode) => {
            const outputChannelClass = outputChannels[output_channel_name];

            // Ensure this channel is not excluded by checking that is has a hotkey defined.
            if (outputChannelClass.hotkey_letter) {
                // Ensure the output channel accepts this output stream. E.g. OutputChannel_OpenFiles does not accept "stderr".
                if (outputChannelClass.acceptsOutputStream(output_stream)) {

                    const textarea_element = textarea_setting.settingEl.find("textarea") as HTMLTextAreaElement;

                    // Create the button
                    redirect_setting.addButton((button) => {
                            button.onClick(async (event: MouseEvent) => {
                                // Handle output
                                await this.redirectOutput(
                                    output_channel_name,
                                    output_stream,
                                    textarea_element,
                                );

                                // Finish
                                if (event.ctrlKey) {
                                    // Special click, control/command key is pressed.
                                    // Close the modal.
                                    this.close();
                                } else {
                                    // Normal click, control key is not pressed.
                                    // Do not close the modal.
                                    textarea_element.focus(); // Bring the focus back to the textarea in order to show a possible highlight (=selection) again.
                                }
                            });

                            // Define button texts and assign hotkeys
                            const output_channel_title: string = outputChannelClass.getTitle(output_stream);

                            // Button text
                            button.setButtonText(output_channel_title);

                            // Tips about hotkeys
                            button.setTooltip(
                                `Redirect: Normal click OR ${CmdOrCtrl()} + ${outputChannelClass.hotkey_letter}.`
                                + EOL + EOL +
                                `Redirect and close the modal: ${CmdOrCtrl()} + click OR ${CmdOrCtrl()} + Shift + ${outputChannelClass.hotkey_letter}.`
                            );
                        },
                    );
                }
            }
        });

        return textarea_setting;
    }
    
    private async redirectOutput(outputChannelName: OutputChannelCode, outputStreamName: OutputStream, sourceTextarea: HTMLTextAreaElement): Promise<void> {
        const outputContent =
            getSelectionFromTextarea(sourceTextarea, true) // Use the selection, or...
            ?? sourceTextarea.value // ...use the whole text, if nothing is selected.
        ;
        const output_streams: OutputStreams = {
            [outputStreamName]: outputContent,
        };
        const outputChannel = initializeOutputChannel(
            outputChannelName,
            this.plugin,
            this.t_shell_command,
            this.shell_command_parsing_result,
            "buffered", // Use "buffered" mode even if this modal was opened in "realtime" mode, because at this point the output redirection is a single-time job, not recurring.
            this.processTerminator,
        );
        await outputChannel.handleBuffered(output_streams, this.exit_code, false); // false: Disable output wrapping as it's already wrapped before the output content was passed to this modal.
    }
    
    /**
     * Looks up for a <textarea> which meets the following criteria:
     *  1) The <textarea> is visible, AND
     *  2) The <textarea> is either:
     *      a) the only <textarea> in this modal, OR
     *      b) having focus.
     * If no <textarea> is found that meets the requirements, the method shows an error message to user and returns null.
     * @private
     */
    private getActiveTextarea(): {textarea: HTMLTextAreaElement; outputStreamName: OutputStream} | null {
        // Pick a <textarea> and output stream name (i.e. `stdout` or `stderr`)
        const activeTextareaCandidates: {textarea: HTMLTextAreaElement, outputStreamName: OutputStream}[] = [];
        for (const outputStreamName of Object.getOwnPropertyNames(this.outputFields) as OutputStream[]) {
            const outputSetting = this.outputFields[outputStreamName];
            const component = outputSetting.components.first();
            if (component instanceof TextAreaComponent) {
                if (component.inputEl.isShown()) {
                    // The textarea is visible. I.e. it doesn't have "SC-hide" CSS class.
                    activeTextareaCandidates.push({
                        textarea: component.inputEl,
                        outputStreamName: outputStreamName,
                    });
                }
            }
        }
        switch (activeTextareaCandidates.length) {
            case 0:
                // No textarea is visible. I'm not sure if this can ever happen? Maybe in "realtime" output mode, but in that mode output modal should only appear after there is some output received.
                this.plugin.newError("No output fields are present, so cannot redirect output.");
                return null;
            case 1:
                // Just one visible textarea exists. Easy pick!
                return activeTextareaCandidates[0];
            default:
                // Multiple visible textareas exist.
                // Try to find one with focus.
                for (const activeTextareaCandidate of activeTextareaCandidates) {
                    if (activeTextareaCandidate.textarea.matches(":focus")) {
                        // Found a focused textarea.
                        return activeTextareaCandidate;
                    }
                }
                // None of the multiple textareas has focus.
                this.plugin.newError("Multiple output fields are present, please put focus on the one you'd like to use.");
                return null;
        }
    }

    public removeProcessTerminatorButton() {
        if (this.processTerminatorButtonContainer) {
            this.processTerminatorButtonContainer.remove();
        }
    }

    /**
     * Should be called only if an exit code was received.
     *
     * @param exit_code Can be null if user terminated the process by clicking a button.
     */
    public setExitCode(exit_code: number | null) {
        this.exit_code = exit_code;

        // Try to show the exit code.
        if (this.isOpen()) {
            if (null === this.exit_code) {
                // User has terminated the process, so there's no exit code even though the process has ended.
                this.exitCodeElement.innerText = "User terminated";
            } else {
                // displayExistCode() can only be called if onOpen() has been called before.
                // If onOpen() will be called later, it will call displayExitCode() itself when it sees that this.exit_code is defined.
                this.displayExitCode();
            }
        }
    }

    private displayExitCode() {
        if (null === this.exit_code) {
            // Currently there are two callers for this method, and both of them does a null check on the exit code before'
            // the call, so we'll never get here in practise.
            // TODO: Remove this checking/throwing and make this method able to display three texts: a) an exit code, b) Executing..., or c) User terminated.
            throw new Error("Cannot display exit code because it's null");
        }
        this.exitCodeElement.innerText = "Exit code: " + this.exit_code.toString();
    }

    private focusFirstField() {
        switch (this.t_shell_command.getOutputChannelOrder()) {
            case "stdout-first": {
                this.outputFields.stdout.controlEl.find("textarea").focus();
                break;
            }
            case "stderr-first": {
                this.outputFields.stderr.controlEl.find("textarea").focus();
                break;
            }
        }
    }

    protected approve(): void {
        // No need to perform any action, just close the modal.
        this.close();
    }
}