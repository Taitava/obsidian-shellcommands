import {App, PluginSettingTab, Setting} from "obsidian";
import ShellCommandsPlugin from "../main";
import {getVaultAbsolutePath} from "../Common";
import {getShellCommandVariableInstructions} from "../variables/ShellCommandVariableInstructions";
import {createShellSelectionField} from "./setting_elements/CreateShellSelectionField";
import {createShellCommandField} from "./setting_elements/CreateShellCommandField";

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

        // Platforms' default shells
        createShellSelectionField(this.plugin, containerEl, this.plugin.settings.default_shells, true);

        // A <div> element for all command input fields. New command fields can be created at the bottom of this element.
        let command_fields_container = containerEl.createEl("div");

        // Fields for modifying existing commands
        for (let command_id in this.plugin.getTShellCommands()) {
            createShellCommandField(this.plugin, command_fields_container, command_id);
        }

        // "New command" button
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText("New command")
                .onClick(async () => {
                    createShellCommandField(this.plugin, command_fields_container, "new");
                    console.log("New empty command created.");
                })
            )
        ;

        // "Error message duration" field
        this.createNotificationDurationField(containerEl, "Error message duration", "Concerns messages about failed shell commands.", "error_message_duration");

        // "Notification message duration" field
        this.createNotificationDurationField(containerEl, "Notification message duration", "Concerns informational, non fatal messages, e.g. output directed to 'Notification balloon'.", "notification_message_duration");

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
                    if (!value) {
                        // Variable previewing is turned from on to off.
                        // This means that the command palette may have old, stale variable data in it (if a user has opened the palette, but closed it without executing anything).
                        // Remove old, preparsed variable data and reset shell commands' names in the command palette.
                        this.plugin.resetPreparsedShellCommandConfigurations();
                        this.plugin.resetCommandPaletteNames();
                    }
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


        // KEEP THIS AFTER CREATING ALL ELEMENTS:
        this.rememberScrollPosition(containerEl);
    }


    createNotificationDurationField(container_element: HTMLElement, title: string, description: string, setting_name: "error_message_duration" | "notification_message_duration") {
        new Setting(container_element)
            .setName(title)
            .setDesc(description + " In seconds, between 1 and 180.")
            .addText(field => field
                .setValue(String(this.plugin.settings[setting_name]))
                .onChange(async (duration_string: string) => {
                    let duration: number = parseInt(duration_string);
                    if (duration >= 1 && duration <= 180) {
                        console.log("Change " + setting_name + " from " + this.plugin.settings[setting_name] + " to " + duration);
                        this.plugin.settings[setting_name] = duration;
                        await this.plugin.saveSettings();
                        console.log("Changed.");
                    }
                    // Don't show a notice if duration is not between 1 and 180, because this function is called every time a user types in this field, so the value might not be final.
                })
            )
        ;
    }

    private scroll_position: number = 0;
    private rememberScrollPosition(container_element: HTMLElement) {
        container_element.scrollTo({
            top: this.scroll_position,
            behavior: "auto",
        });
        container_element.addEventListener("scroll", (event) => {
            this.scroll_position = container_element.scrollTop;
        });
    }
}

export interface ShellCommandSettingGroup {
    name_setting: Setting;
    shell_command_setting: Setting;
    preview_setting: Setting;
}