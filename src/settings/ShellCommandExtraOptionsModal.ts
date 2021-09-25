import {App, Modal, Notice, Setting} from "obsidian";
import ShellCommandsPlugin from "../main";
import {ShellCommandConfiguration} from "./ShellCommandConfiguration";
import {ShellCommandSettingGroup, ShellCommandsSettingsTab} from "./ShellCommandsSettingsTab";

export class ShellCommandExtraOptionsModal extends Modal {
    static OPTIONS_SUMMARY = "Options: Alias, Confirmation";

    private plugin: ShellCommandsPlugin;
    private readonly shell_command_id: string;
    private readonly shell_command_configuration: ShellCommandConfiguration;
    private name_setting: Setting;
    private setting_tab: ShellCommandsSettingsTab;

    constructor(app: App, plugin: ShellCommandsPlugin, shell_command_id: string, setting_group: ShellCommandSettingGroup, setting_tab: ShellCommandsSettingsTab) {
        super(app);
        this.plugin = plugin;
        this.shell_command_id = shell_command_id;
        this.shell_command_configuration = plugin.getShellCommands()[shell_command_id];
        this.name_setting = setting_group.name_setting;
        this.setting_tab = setting_tab;
    }

    onOpen() {
        this.modalEl.createEl("h2", {text: this.shell_command_configuration.shell_command});

        // Alias field
        new Setting(this.modalEl)
            .setName("Alias")
            .setClass("shell-commands-name-setting")
        ;
        let alias_setting = new Setting(this.modalEl)
            .addText(text => text
                .setValue(this.shell_command_configuration.alias)
                .onChange(async (value) => {
                    // Change the actual alias value
                    this.shell_command_configuration.alias = value;

                    // Update Obsidian command palette
                    this.plugin.obsidian_commands[this.shell_command_id].name = this.plugin.generateObsidianCommandName(this.shell_command_configuration);

                    // UpdateShell commands settings panel
                    this.name_setting.setName(this.setting_tab.generateCommandFieldName(this.shell_command_id, this.shell_command_configuration));

                    // Save
                    await this.plugin.saveSettings();
                })
            )
            .setClass("shell-commands-shell-command-setting")
        ;
        alias_setting.controlEl.find("input").focus(); // Focus without a need to click the field.
        this.modalEl.createEl("p", {text: "If not empty, the alias will be displayed in the command palette instead of the actual command. An alias is never executed as a command."});
        this.modalEl.createEl("p", {text: "You can also use the same {{}} style variables in aliases that are used in shell commands. When variables are used in aliases, they do not affect the command execution in any way, but it's a nice way to reveal what values your command will use, even when an alias hides most of the other technical details."});

        // Confirm execution field
        new Setting(this.modalEl)
            .setName("Ask confirmation before execution")
            .addToggle(toggle => toggle
                .setValue(this.shell_command_configuration.confirm_execution)
                .onChange(async (value) => {
                    this.shell_command_configuration.confirm_execution = value;
                    let icon_container = this.name_setting.nameEl.find("span.shell-commands-confirm-execution-icon-container");
                    if (this.shell_command_configuration.confirm_execution) {
                        // Show icon
                        icon_container.removeClass("shell-commands-hide");
                    } else {
                        // Hide icon
                        icon_container.addClass("shell-commands-hide");
                    }
                    await this.plugin.saveSettings();
                })
            )
        ;

    }
}