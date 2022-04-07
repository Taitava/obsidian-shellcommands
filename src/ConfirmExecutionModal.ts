import {
    debugLog,
    SC_Modal,
    SC_Plugin,
    ShellCommandExecutor,
    ShellCommandParsingResult,
    TShellCommand,
} from "./imports";
import {Setting} from "obsidian";

export class ConfirmExecutionModal extends SC_Modal {

    private readonly shell_command_parsing_result: ShellCommandParsingResult;
    private readonly t_shell_command: TShellCommand;

    constructor(plugin: SC_Plugin, shell_command_parsing_result: ShellCommandParsingResult, t_shell_command: TShellCommand) {
        super(plugin);
        this.shell_command_parsing_result = shell_command_parsing_result;
        this.t_shell_command = t_shell_command;
    }

    public onOpen() {
        super.onOpen();

        // Information about the shell command
        this.modalEl.createEl("h2", {text: this.shell_command_parsing_result.shell_command, attr: {style: "margin-bottom: 0;"}}); // TODO: Use this.setTitle() instead.
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
                    const executor = new ShellCommandExecutor(this.plugin, this.t_shell_command, null); // sc_event is null, because variables are already parsed at this point (so not event related variables are needed at this point). This will change when this confirmation is refactored into a Preaction, in which point the confirmation will not call .executeShellCommand() directly anymore.
                    executor.executeShellCommand( this.shell_command_parsing_result);
                    this.close();
                })
            )
        ;

    }
}