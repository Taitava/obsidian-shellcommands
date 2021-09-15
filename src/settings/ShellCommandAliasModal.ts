class ShellCommandAliasModal extends Modal {
    private plugin: ShellCommandsPlugin;
    private readonly shell_command_id: string;
    private readonly shell_command_configuration: ShellCommandConfiguration;
    private setting_field: Setting;
    private setting_tab: ShellCommandsSettingsTab;
    private alias_field: HTMLInputElement;

    constructor(app: App, plugin: ShellCommandsPlugin, shell_command_id: string, setting_field: Setting, setting_tab: ShellCommandsSettingsTab) {
        super(app);
        this.plugin = plugin;
        this.shell_command_id = shell_command_id;
        this.shell_command_configuration = plugin.getShellCommands()[shell_command_id];
        this.setting_field = setting_field;
        this.setting_tab = setting_tab;
    }

    onOpen() {
        this.modalEl.createEl("h2", {text: "Alias for: " + this.shell_command_configuration.shell_command});
        this.alias_field = this.modalEl.createEl("input", {type: "text", value: this.shell_command_configuration.alias});
        this.modalEl.createEl("p", {text: "If not empty, the alias will be displayed in the command palette instead of the actual command. An alias is never executed as a command."});
        this.modalEl.createEl("p", {text: "You can also use the same {{}} style variables in aliases that are used in shell commands. When variables are used in aliases, they do not affect the command execution in any way, but it's a nice way to reveal what values your command will use, even when an alias hides most of the other technical details."});
        this.alias_field.focus(); // Focus without a need to click the field.
    }

    async onClose() {
        let new_alias = this.alias_field.value;
        if (new_alias !== this.shell_command_configuration.alias) {
            // Change the alias
            console.log("Change shell command #" + this.shell_command_id + "'s alias from \"" + this.shell_command_configuration.alias + "\" to \"" + new_alias + "\".");
            this.shell_command_configuration.alias = new_alias;
            this.plugin.obsidian_commands[this.shell_command_id].name = this.plugin.generateObsidianCommandName(this.shell_command_configuration);
            this.setting_field.setName(this.setting_tab.generateCommandFieldName(this.shell_command_id, this.shell_command_configuration));
            await this.plugin.saveSettings();
            console.log(new_alias ? "Alias changed." : "Alias removed.");
            new Notice(new_alias ? "Alias changed!" : "Alias removed!");
        }
    }
}