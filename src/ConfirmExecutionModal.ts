import {Modal, Setting} from "obsidian";
import ShellCommandsPlugin from "./main";
import {TShellCommand} from "./TShellCommand";

export class ConfirmExecutionModal extends Modal {
    private plugin: ShellCommandsPlugin;
    private readonly shell_command: string;
    private readonly t_shell_command: TShellCommand;

    constructor(plugin: ShellCommandsPlugin, shell_command: string, t_shell_command: TShellCommand) {
        super(plugin.app);
        this.plugin = plugin;
        this.shell_command = shell_command;
        this.t_shell_command = t_shell_command;
    }

    open() {
        super.open();

        // Information about the shell command
        this.modalEl.createEl("h2", {text: this.shell_command, attr: {style: "margin-bottom: 0;"}});
        if (this.t_shell_command.getAlias()) {
            let paragraph = this.modalEl.createEl("p", {text: "Alias: " + this.t_shell_command.getAlias(), attr: {style: "margin-top: 0;"}});
        }
        this.modalEl.createEl("p", {text: "Execute this shell command?"});

        // Execute button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText("Yes, execute!")
                .onClick(() => {
                    console.log("User confirmed execution of shell command: " + this.shell_command);
                    this.plugin.executeShellCommand(this.shell_command, this.t_shell_command);
                    this.close();
                })
            )
        ;

    }
}