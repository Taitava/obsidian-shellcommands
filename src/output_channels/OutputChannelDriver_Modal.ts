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

import {OutputChannelDriver} from "./OutputChannelDriver";
import {
    getOutputChannelDrivers,
    initializeOutputChannelDriver,
    OutputStreams,
} from "./OutputChannelDriverFunctions";
import {ButtonComponent, Setting, TextAreaComponent} from "obsidian";
import {OutputChannel, OutputStream} from "./OutputChannel";
import SC_Plugin from "../main";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {SC_Modal} from "../SC_Modal";
import {getSelectionFromTextarea} from "../Common";
import {CmdOrCtrl} from "../Hotkeys";
import {EOL} from "os";

export class OutputChannelDriver_Modal extends OutputChannelDriver {
    protected static readonly title = "Ask after execution";

    protected _handleBuffered(outputs: OutputStreams, error_code: number | null): void {
        // Initialize a modal and pass outputs
        const modal = new OutputModal(this.plugin, outputs, this.t_shell_command, this.shell_command_parsing_result);

        // Define a possible error code to be shown on the modal.
        if (error_code !== null) {
            modal.setExitCode(error_code);
        }

        // Done
        modal.open();
    }

}

class OutputModal extends SC_Modal {

    private readonly outputs: OutputStreams;
    private readonly t_shell_command: TShellCommand;
    private readonly shell_command_parsing_result: ShellCommandParsingResult;
    private exit_code: number = null;

    constructor(plugin: SC_Plugin, outputs: OutputStreams, t_shell_command: TShellCommand, shell_command_parsing_result: ShellCommandParsingResult) {
        super(plugin);

        this.outputs = outputs;
        this.t_shell_command = t_shell_command;
        this.shell_command_parsing_result = shell_command_parsing_result;
    }

    public onOpen(): void {
        super.onOpen();

        // Heading
        const heading = this.shell_command_parsing_result.alias;
        this.titleEl.innerText = heading ? heading : "Shell command output";  // TODO: Use this.setTitle() instead.

        // Shell command preview
        this.modalEl.createEl("pre", {text: this.shell_command_parsing_result.shell_command, attr: {class: "SC-no-margin SC-wrappable"}}); // no margin so that exit code will be close.

        // Exit code
        if (this.exit_code !== null) {
            this.modalEl.createEl("small", {text: "Exit code: " + this.exit_code});
        }

        // Outputs
        let is_first = true;
        Object.getOwnPropertyNames(this.outputs).forEach((output_stream: OutputStream) => {
            const output_setting = this.createOutputField(output_stream, this.outputs[output_stream]);

            // Focus on the first output field
            if (is_first) {
                output_setting.controlEl.find("textarea").focus();
                is_first = false;
            }
        });

        // A tip about selecting text.
        this.modalEl.createDiv({
            text: "Tip! If you select something, only the selected text will be used.",
            attr: {class: "setting-item-description" /* A CSS class defined by Obsidian. */},
        });
    }

    private createOutputField(output_stream: OutputStream, output: string) {
        let output_textarea: TextAreaComponent;

        this.modalEl.createEl("hr", {attr: {class: "SC-no-margin"}});

        // Output stream name
        new Setting(this.modalEl)
            .setName(output_stream)
            .setHeading()
            .setClass("SC-no-bottom-border")
        ;

        // Textarea
        const textarea_setting = new Setting(this.modalEl)
            .addTextArea(textarea => output_textarea = textarea
                .setValue(output)
            )
        ;
        textarea_setting.infoEl.addClass("SC-hide"); // Make room for the textarea by hiding the left column.
        textarea_setting.settingEl.addClass("SC-output-channel-modal-textarea-container", "SC-no-top-border");

        // Add controls for redirecting the output to another channel.
        const redirect_setting = new Setting(this.modalEl)
            .setDesc("Redirect:")
            .setClass("SC-no-top-border")
            .setClass("SC-output-channel-modal-redirection-buttons-container") // I think this calls actually HTMLDivElement.addClass(), so it should not override the previous .setClass().
        ;
        const output_channel_drivers = getOutputChannelDrivers();
        Object.getOwnPropertyNames(output_channel_drivers).forEach((output_channel_name: OutputChannel) => {
            const outputChannelDriverClass = output_channel_drivers[output_channel_name];

            // Ensure this channel is not excluded by checking that is has a hotkey defined.
            if (outputChannelDriverClass.hotkey_letter) {
                // Ensure the output channel accepts this output stream. E.g. OutputChannelDriver_OpenFiles does not accept "stderr".
                if (outputChannelDriverClass.acceptsOutputStream(output_stream)) {

                    const textarea_element = textarea_setting.settingEl.find("textarea") as HTMLTextAreaElement;

                    // Define an output handler
                    const handle_output = () => {
                        // Redirect output to the selected driver
                        const output_streams: OutputStreams = {};
                        output_streams[output_stream] =
                            getSelectionFromTextarea(textarea_element, true) // Use the selection, or...
                            ?? output_textarea.getValue() // ...use the whole text, if nothing is selected.
                        ;
                        const outputChannelDriver = initializeOutputChannelDriver(
                            output_channel_name,
                            this.plugin,
                            this.t_shell_command,
                            this.shell_command_parsing_result,
                            "buffered", // Use "buffered" mode even if this modal was opened in "realtime" mode, because at this point the output redirection is a single-time job, not recurring.
                        );
                        outputChannelDriver.handleBuffered(output_streams, this.exit_code);
                    };

                    // Create the button
                    let redirect_button: ButtonComponent;
                    redirect_setting.addButton((button) => {
                            redirect_button = button;
                            button.onClick((event: MouseEvent) => {
                                // Handle output
                                handle_output();

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
                        },
                    );

                    // Define button texts and assign hotkeys
                    const output_channel_title: string = outputChannelDriverClass.getTitle(output_stream);

                    // Button text
                    redirect_button.setButtonText(output_channel_title);

                    // Tips about hotkeys
                    redirect_button.setTooltip(
                        `Redirect: Normal click OR ${CmdOrCtrl()} + ${outputChannelDriverClass.hotkey_letter}.`
                        + EOL + EOL +
                        `Redirect and close the modal: ${CmdOrCtrl()} + click OR ${CmdOrCtrl()} + Shift + ${outputChannelDriverClass.hotkey_letter}.`
                    );

                    // 1. hotkey: Ctrl/Cmd + number: handle output
                    this.scope.register(["Ctrl"], outputChannelDriverClass.hotkey_letter, handle_output);

                    // 2. hotkey: Ctrl/Cmd + Shift + number: handle output and close the modal.
                    this.scope.register(["Ctrl", "Shift"], outputChannelDriverClass.hotkey_letter, () => {
                        handle_output();
                        this.close();
                    });
                }
            }
        });

        return textarea_setting;
    }

    /**
     * Should be called only if an exit code was received.
     *
     * @param exit_code
     */
    public setExitCode(exit_code: number) {
        this.exit_code = exit_code;
    }

    protected approve(): void {
        // No need to perform any action, just close the modal.
        this.close();
    }
}