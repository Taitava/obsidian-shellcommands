import {Modal, Setting} from "obsidian";
import ShellCommandsPlugin from "../main";
import {ShellCommandConfiguration} from "./ShellCommandConfiguration";

export class ShellCommandDeleteModal extends Modal {
    private plugin: ShellCommandsPlugin;
    private readonly shell_command_id: string;
    private readonly shell_command_configuration: ShellCommandConfiguration;
    private setting_field: Setting;

    constructor(plugin: ShellCommandsPlugin, shell_command_id: string, setting_field: Setting) {
        super(plugin.app);
        this.plugin = plugin;
        this.shell_command_id = shell_command_id;
        this.shell_command_configuration = plugin.getShellCommands()[shell_command_id];
        this.setting_field = setting_field;
    }

    onOpen() {
        this.modalEl.createEl("h2", {text: "Delete: " + this.shell_command_configuration.shell_command});
        if (this.shell_command_configuration.alias) {
            this.modalEl.createEl("p", {text: "Alias: " + this.shell_command_configuration.alias});
        }
        this.modalEl.createEl("p", {text: "Are you sure you want to delete this shell command?"});
        let delete_button = this.modalEl.createEl("button", {text: "Yes, delete"});
        delete_button.onclick = async () => {
            // Remove the command
            console.log("Command " + this.shell_command_id + " gonna be removed.");
            delete this.plugin.getShellCommands()[this.shell_command_id]; // Remove from the plugin's settings.
            delete this.plugin.obsidian_commands[this.shell_command_id]; // Remove from the command palette.

            // TODO: Remove the setting field


            await this.plugin.saveSettings();
            console.log("Command removed.");
            this.close();
        };
    }

}