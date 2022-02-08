import {Modal, Setting} from "obsidian";
import SC_Plugin from "./main";
import {ParsingResult, TShellCommand} from "./TShellCommand";
import {debugLog} from "./Debug";

export class ConfirmExecutionModal extends Modal {
    private plugin: SC_Plugin;
    private readonly shell_command_parsing_result: ParsingResult;
    private readonly t_shell_command: TShellCommand;

    constructor(plugin: SC_Plugin, shell_command_parsing_result: ParsingResult, t_shell_command: TShellCommand) {
        super(plugin.app);
        this.plugin = plugin;
        this.shell_command_parsing_result = shell_command_parsing_result;
        this.t_shell_command = t_shell_command;
    }

    open() {
        super.open();

        // Information about the shell command
        this.modalEl.createEl("h2", {text: this.shell_command_parsing_result.shell_command, attr: {style: "margin-bottom: 0;"}});
        if (this.shell_command_parsing_result.alias) {
            this.modalEl.createEl("p", {text: "Alias: " + this.shell_command_parsing_result.alias, attr: {style: "margin-top: 0;"}});
        }
        this.modalEl.createEl("p", {text: "Execute this shell command?"});

        // Execute button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText("Yes, execute!")
                .onClick(() => {
                    debugLog("User confirmed execution of shell command: " + this.shell_command_parsing_result);
                    this.plugin.executeShellCommand(this.t_shell_command, this.shell_command_parsing_result);
                    this.close();
                })
            )
        ;

    }
}