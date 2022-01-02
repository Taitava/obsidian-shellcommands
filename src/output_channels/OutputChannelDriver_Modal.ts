import {OutputChannelDriver} from "./OutputChannelDriver";
import {
    getOutputChannelDrivers,
    OutputStreams,
} from "./OutputChannelDriverFunctions";
import {Modal, Setting, TextAreaComponent} from "obsidian";
import {OutputChannel, OutputStream} from "./OutputChannel";
import ShellCommandsPlugin from "../main";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";

export class OutputChannelDriver_Modal extends OutputChannelDriver {
    protected readonly title = "Modal";

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

class OutputModal extends Modal {

    private readonly plugin: ShellCommandsPlugin;
    private readonly outputs: OutputStreams;
    private readonly t_shell_command: TShellCommand;
    private readonly shell_command_parsing_result: ShellCommandParsingResult;
    private exit_code: number = null;

    constructor(plugin: ShellCommandsPlugin, outputs: OutputStreams, t_shell_command: TShellCommand, shell_command_parsing_result: ShellCommandParsingResult) {
        super(plugin.app);

        this.plugin = plugin;
        this.outputs = outputs;
        this.t_shell_command = t_shell_command;
        this.shell_command_parsing_result = shell_command_parsing_result;
    }

    public onOpen(): void {

        // Make the modal scrollable if it has more content than what fits in the screen.
        this.modalEl.addClass("SC-scrollable"); // TODO: Maybe make a common parent class for all SC's modals and do this there?

        // Heading
        const heading = this.shell_command_parsing_result.alias;
        this.titleEl.innerText = heading ? heading : "Shell command output";

        // Shell command preview
        this.modalEl.createEl("pre", {text: this.shell_command_parsing_result.shell_command, attr: {class: "SC-no-margin"}}); // no margin so that exit code will be close.

        // Exit code
        if (this.exit_code !== null) {
            this.modalEl.createEl("small", {text: "Exit code: " + this.exit_code});
        }

        // Outputs
        Object.getOwnPropertyNames(this.outputs).forEach((output_stream: OutputStream) => {
            this.createOutputField(output_stream, this.outputs[output_stream]);
        });
    }

    public createOutputField(output_stream: OutputStream, output: string) {
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
        textarea_setting.infoEl.addClass("shell-commands-hide"); // Make room for the textarea by hiding the left column.
        textarea_setting.settingEl.addClass("SC-output-channel-modal-textarea-container", "SC-no-top-border");

        // Add controls for redirecting the output to another channel.
        const redirect_setting = new Setting(this.modalEl)
            .setDesc("Redirect:")
            .setClass("SC-no-top-border")
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
                redirect_setting.addButton(button => button
                    .setButtonText(output_channel_driver.getTitle(output_stream))
                    .onClick(() => {
                        // Redirect output to the selected driver
                        const output_streams: OutputStreams = {};
                        output_streams[output_stream] = output_textarea.getValue();
                        output_channel_driver.initialize(this.plugin, this.t_shell_command, this.shell_command_parsing_result);
                        output_channel_driver.handle(output_streams, this.exit_code);
                    }),
                );
            }
        });
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