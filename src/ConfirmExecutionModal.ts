import {Modal, Setting} from "obsidian";
import ShellCommandsPlugin from "./main";
import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";

export class ConfirmExecutionModal extends Modal {
    private plugin: ShellCommandsPlugin;
    private readonly shell_command: string;
    private shell_command_configuration: ShellCommandConfiguration;

    constructor(plugin: ShellCommandsPlugin, shell_command: string, shell_command_configuration: ShellCommandConfiguration) {
        super(plugin.app);
        this.plugin = plugin;
        this.shell_command = shell_command;
        this.shell_command_configuration = shell_command_configuration;
    }

    open() {
        super.open();

        // Information about the shell command
        this.modalEl.createEl("h2", {text: this.shell_command, attr: {style: "margin-bottom: 0;"}});
        if (this.shell_command_configuration.alias) {
            let paragraph = this.modalEl.createEl("p", {text: "Alias: " + this.shell_command_configuration.alias, attr: {style: "margin-top: 0;"}});
        }
        this.modalEl.createEl("p", {text: "Execute this shell command?"});

        // Execute button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText("Yes, execute!")
                .onClick(() => {
                    console.log("User confirmed execution of shell command: " + this.shell_command);
                    this.plugin.executeShellCommand(this.shell_command, this.shell_command_configuration);
                    this.close();
                })
            )
        ;

    }
}