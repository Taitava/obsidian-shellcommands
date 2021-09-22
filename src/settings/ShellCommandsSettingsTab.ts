import {App, Hotkey, PluginSettingTab, setIcon, Setting} from "obsidian";
import ShellCommandsPlugin from "../main";
import {getVaultAbsolutePath, isWindows} from "../Common";
import {newShellCommandConfiguration, ShellCommandConfiguration} from "./ShellCommandConfiguration";
import {ShellCommandExtraOptionsModal} from "./ShellCommandExtraOptionsModal";
import {ShellCommandDeleteModal} from "./ShellCommandDeleteModal";
import {getShellCommandVariableInstructions} from "../variables/ShellCommandVariableInstructions";
import {parseShellCommandVariables} from "../variables/parseShellCommandVariables";
import {getHotkeysForShellCommand, HotkeyToString} from "../Hotkeys";

export class ShellCommandsSettingsTab extends PluginSettingTab {
    plugin: ShellCommandsPlugin;

    constructor(app: App, plugin: ShellCommandsPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: "Shell commands"});

        // "Working directory" field
        new Setting(containerEl)
            .setName("Working directory")
            .setDesc("A directory where your commands will be run. If empty, defaults to your vault's location. Can be relative (= a folder in the vault) or absolute (= complete from filesystem root).")
            .addText(text => text
                .setPlaceholder(getVaultAbsolutePath(this.app))
                .setValue(this.plugin.settings.working_directory)
                .onChange(async (value) => {
                    console.log("Changing working_directory to " + value);
                    this.plugin.settings.working_directory = value;
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Tips when the user has already defined some commands
        if (Object.keys(this.plugin.getShellCommands()).length > 0) {
            if (isWindows()) containerEl.createEl('p', {text: "Tip for Windows: If you get an error starting with \"[259]: Command failed:\" even though the execution works ok, you can try to prefix your command with \"start \". E.g. \"start git-gui\"."});
        }

        // A <div> element for all command input fields. New command fields can be created at the bottom of this element.
        let command_fields_container = containerEl.createEl("div");

        // Fields for modifying existing commands
        for (let command_id in this.plugin.getShellCommands()) {
            this.createCommandField(command_fields_container, command_id);
        }

        // "New command" button
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText("New command")
                .onClick(async () => {
                    this.createCommandField(command_fields_container, "new");
                    console.log("New empty command created.");
                })
            )
        ;

        // "Error message duration" field
        new Setting(containerEl)
            .setName("Error message duration")
            .setDesc("In seconds, between 1 and 180.")
            .addText(field => field
                .setValue(String(this.plugin.settings.error_message_duration))
                .onChange(async (duration_string: string) => {
                    let duration: number = parseInt(duration_string);
                    if (duration >= 1 && duration <= 180) {
                        console.log("Change error_message_duration from " + this.plugin.settings.error_message_duration + " to " + duration);
                        this.plugin.settings.error_message_duration = duration;
                        await this.plugin.saveSettings();
                        console.log("Changed.");
                    }
                    // Don't show a notice if duration is not between 1 and 180, because this function is called every time a user types in this field, so the value might not be final.
                })
            )
        ;

        // "Variables" section
        containerEl.createEl("h2", {text: "Variables"});

        // "Preview variables in command palette" field
        new Setting(containerEl)
            .setName("Preview variables in command palette")
            .setDesc("If on, variable names are substituted with their realtime values when you view your commands in the command palette. A nice way to ensure your commands will use correct values.")
            .addToggle(checkbox => checkbox
                .setValue(this.plugin.settings.preview_variables_in_command_palette)
                .onChange(async (value: boolean) => {
                    console.log("Changing preview_variables_in_command_palette to " + value);
                    this.plugin.settings.preview_variables_in_command_palette = value;
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Variable instructions
        getShellCommandVariableInstructions().forEach((instructions) => {
            let paragraph = containerEl.createEl("p");
            // @ts-ignore
            paragraph.createEl("strong", {text: instructions.variable_name + " "});
            // @ts-ignore
            paragraph.createEl("span", {text: instructions.instructions});
        });
        containerEl.createEl("p", {text: "When you type variables into commands, a preview text appears under the command field to show how the command will look like when it gets executed with variables substituted with their real values."})
        containerEl.createEl("p", {text: "There is no way to escape variable parsing. If you need {{ }} characters in your command, they won't be parsed as variables as long as they do not contain any of the variable names listed below. If you would need to pass e.g. {{title}} literally to your command, there is no way to do it atm, please raise an issue in GitHub."})
        containerEl.createEl("p", {text: "All variables that access the current file, may cause the command preview to fail if you had no file panel active when you opened the settings window - e.g. you had focus on graph view instead of a note = no file is currently active. But this does not break anything else than the preview."})
    }

    /**
     *
     * @param container_element
     * @param shell_command_id Either a string formatted integer ("0", "1" etc) or "new" if it's a field for a command that does not exist yet.
     */
    createCommandField(container_element: HTMLElement, shell_command_id: string) {
        let is_new = "new" === shell_command_id;
        let shell_command_configuration: ShellCommandConfiguration;
        if (is_new) {
            // Create an empty command
            shell_command_id = this.plugin.generateNewShellCommandID();
            shell_command_configuration = newShellCommandConfiguration();
            this.plugin.getShellCommands()[shell_command_id] = shell_command_configuration;
        } else {
            // Use an old shell command
            shell_command_configuration = this.plugin.getShellCommands()[shell_command_id];
        }
        console.log("Create command field for command #" + shell_command_id + (is_new ? " (NEW)" : ""));
        let shell_command: string;
        if (is_new) {
            shell_command = "";
        } else {
            shell_command = shell_command_configuration.shell_command;
        }
        let setting_group: ShellCommandSettingGroup = {
            name_setting:
                new Setting(container_element)
                .setName(this.generateCommandFieldName(shell_command_id, this.plugin.getShellCommands()[shell_command_id]))
                .addExtraButton(button => button
                    .setTooltip(ShellCommandExtraOptionsModal.OPTIONS_SUMMARY)
                    .onClick(async () => {
                        // Open an extra options modal
                        let modal = new ShellCommandExtraOptionsModal(this.app, this.plugin, shell_command_id, setting_group, this);
                        modal.open();
                    })
                )
                .addExtraButton(button => button
                    .setTooltip("Delete this shell command")
                    .setIcon("trash")
                    .onClick(async () => {
                        // Open a delete modal
                        let modal = new ShellCommandDeleteModal(this.plugin, shell_command_id, setting_group, container_element);
                        modal.open();
                    })
                )
                .setClass("shell-commands-name-setting")
            ,
            shell_command_setting:
                new Setting(container_element)
                .addText(text => text
                    .setPlaceholder("Enter your command")
                    .setValue(shell_command)
                    .onChange(async (field_value) => {
                        let shell_command = field_value;
                        setting_group.preview_setting.setDesc(this.getShellCommandPreview(shell_command));

                        if (is_new) {
                            console.log("Creating new command " + shell_command_id + ": " + shell_command);
                        } else {
                            console.log("Command " + shell_command_id + " gonna change to: " + shell_command);
                        }

                        // Do this in both cases, when creating a new command and when changing an old one:
                        shell_command_configuration.shell_command = shell_command;

                        if (is_new) {
                            // Create a new command
                            this.plugin.registerShellCommand(shell_command_id, shell_command_configuration);
                            console.log("Command created.");
                        } else {
                            // Change an old command
                            this.plugin.obsidian_commands[shell_command_id].name = this.plugin.generateObsidianCommandName(this.plugin.getShellCommands()[shell_command_id]); // Change the command's name in Obsidian's command palette.
                            console.log("Command changed.");
                        }
                        await this.plugin.saveSettings();
                    })
                )
                .setClass("shell-commands-shell-command-setting")
            ,
            preview_setting:
                new Setting(container_element)
                    .setDesc(this.getShellCommandPreview(shell_command))
                    .setClass("shell-commands-preview-setting")
            ,
        };

        // Add "Ask confirmation" icon.
        let icon_container = setting_group.name_setting.nameEl.createEl("span", {attr: {class: "shell-commands-main-icon-container"}});
        let confirm_execution_icon_container = icon_container.createEl("span", {title: "Asks confirmation before execution.", attr: {class: "shell-commands-confirm-execution-icon-container"}});
        setIcon(confirm_execution_icon_container, "languages");
        if (!shell_command_configuration.confirm_execution) {
            // Do not display the icon for commands that do not use confirmation.
            confirm_execution_icon_container.addClass("shell-commands-hide");
        }

        // Add hotkey information
        if (!is_new) {
            let hotkeys = getHotkeysForShellCommand(this.plugin, shell_command_id);
            if (hotkeys) {
                let hotkeys_joined: string = "";
                hotkeys.forEach((hotkey: Hotkey) => {
                    if (hotkeys_joined) {
                        hotkeys_joined += "<br>"
                    }
                    hotkeys_joined += HotkeyToString(hotkey);
                });
                let hotkey_div = setting_group.preview_setting.controlEl.createEl("div", { attr: {class: "setting-item-description shell-commands-hotkey-info"}});
                // Comment out the icon because it would look like a clickable button (as there are other clickable icons in the settings).
                // setIcon(hotkey_div, "any-key", 22); // Hotkey icon
                hotkey_div.insertAdjacentHTML("beforeend", " " + hotkeys_joined);
            }
        }
        console.log("Created.");
    }

    getShellCommandPreview(command: string) {
        let parsed_command = parseShellCommandVariables(this.plugin, command, false); // false: disables notifications if variables have syntax errors.
        if (null === parsed_command) {
            return "[Error while parsing variables.]";
        }
        return parsed_command;
    }

    /**
     * @param shell_command_id String like "0" or "1" etc.
     * @param shell_command_configuration
     * @public Public because ShellCommandAliasModal uses this too.
     */
    public generateCommandFieldName(shell_command_id: string, shell_command_configuration: ShellCommandConfiguration) {
        if (shell_command_configuration.alias) {
            return shell_command_configuration.alias;
        }
        return "Command #" + shell_command_id;
    }
}

export interface ShellCommandSettingGroup {
    name_setting: Setting;
    shell_command_setting: Setting;
    preview_setting: Setting;
}