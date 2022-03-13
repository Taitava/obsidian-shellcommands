import {OutputChannelDriver} from "./OutputChannelDriver";
import {
    getOutputChannelDrivers,
    OutputStreams,
} from "./OutputChannelDriverFunctions";
import {Setting, TextAreaComponent} from "obsidian";
import {OutputChannel, OutputStream} from "./OutputChannel";
import SC_Plugin from "../main";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {SC_Modal} from "../SC_Modal";
import {getSelectionFromTextarea} from "../Common";

export class OutputChannelDriver_Modal extends OutputChannelDriver {
    protected readonly title = "Ask after execution";

    protected _handle(outputs: OutputStreams, error_code: number | null): void {
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
        const excluded_output_channels: OutputChannel[] = [
            "notification", // Would not make sense to create a temporary balloon for text that is already visible.
            "modal",        // Would not make sense to open a new modal for the same thing.
        ];
        const output_channel_drivers = getOutputChannelDrivers();
        Object.getOwnPropertyNames(output_channel_drivers).forEach((output_channel_name: OutputChannel) => {
            // Ensure this channel is not excluded
            if (!excluded_output_channels.contains(output_channel_name)) {
                const output_channel_driver = output_channel_drivers[output_channel_name];
                // Ensure the output channel accepts this output stream. E.g. OutputChannelDriver_OpenFiles does not accept "stderr".
                if (output_channel_driver.acceptsOutputStream(output_stream)) {
                    redirect_setting.addButton(button => button
                        .setButtonText(output_channel_driver.getTitle(output_stream))
                        .onClick(() => {
                            // Redirect output to the selected driver
                            const output_streams: OutputStreams = {};
                            const textarea_element = textarea_setting.settingEl.find("textarea") as HTMLTextAreaElement;
                            output_streams[output_stream] =
                                getSelectionFromTextarea(textarea_element, true) // Use the selection, or...
                                ?? output_textarea.getValue() // ...use the whole text, if nothing is selected.
                            ;
                            output_channel_driver.initialize(this.plugin, this.t_shell_command, this.shell_command_parsing_result);
                            output_channel_driver.handle(output_streams, this.exit_code);
                            textarea_element.focus(); // Bring the focus back to the textarea in order to show a possible highlight (=selection) again.
                        }),
                    );
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

}