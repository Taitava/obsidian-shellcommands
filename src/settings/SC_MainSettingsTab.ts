/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {App, PluginSettingTab, Setting} from "obsidian";
import SC_Plugin from "../main";
import {getVaultAbsolutePath, gotoURL} from "../Common";
import {createShellSelectionField} from "./setting_elements/CreateShellSelectionField";
import {createShellCommandField} from "./setting_elements/CreateShellCommandField";
import {createTabs, TabStructure} from "./setting_elements/Tabs";
import {debugLog} from "../Debug";
import {
    DocumentationAutocompleteLink,
    DocumentationMainLink,
    DocumentationBuiltInVariablesLink,
    GitHubLink,
    ChangelogLink,
    DocumentationCustomVariablesLink,
} from "../Documentation";
import {Variable} from "../variables/Variable";
import {getSC_Events} from "../events/SC_EventList";
import {SC_Event} from "../events/SC_Event";
import {TShellCommand} from "../TShellCommand";
import {
    CustomVariable,
    CustomVariableInstance,
    CustomVariableModel,
    getModel,
    Prompt,
    PromptModel
} from "../imports";
import {createNewModelInstanceButton} from "../models/createNewModelInstanceButton";

export class SC_MainSettingsTab extends PluginSettingTab {
    private readonly plugin: SC_Plugin;

    private tab_structure: TabStructure;

    constructor(app: App, plugin: SC_Plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    public display(): void {
        const {containerEl} = this;

        containerEl.empty();

        this.tab_structure = createTabs(containerEl, {
            "main-shell-commands": {
                title: "Shell commands",
                icon: "run-command",
                content_generator: (container_element: HTMLElement) => {
                    this.tabShellCommands(container_element);
                },
            },
            "main-environments": {
                title: "Environments",
                icon: "stacked-levels",
                content_generator: (container_element: HTMLElement) => {
                    this.tabEnvironments(container_element);
                },
            },
            "main-preactions": {
                title: "Preactions",
                icon: "note-glyph",
                content_generator: (container_element: HTMLElement) => {
                    this.tabPreactions(container_element);
                },
            },
            "main-output": {
                title: "Output",
                icon: "lines-of-text",
                content_generator: (container_element: HTMLElement) => {
                    this.tabOutput(container_element);
                },
            },
            "main-events": {
                title: "Events",
                icon: "dice",
                content_generator: (container_element: HTMLElement) => {
                    this.tabEvents(container_element);
                },
            },
            "main-variables": {
                title: "Variables",
                icon: "code-glyph",
                content_generator: (container_element: HTMLElement) => {
                    this.tabVariables(container_element);
                },
            },
        });

        // Documentation link & GitHub links
        containerEl.createEl("p").insertAdjacentHTML("beforeend",
            "<a href=\"" + DocumentationMainLink + "\">Documentation</a> - " +
            "<a href=\"" + GitHubLink + "\">SC on GitHub</a> - " +
            "<a href=\"" + ChangelogLink + "\">SC version: " + this.plugin.getPluginVersion() + "</a>",
        );

        // KEEP THIS AFTER CREATING ALL ELEMENTS:
        this.rememberLastPosition(containerEl);
    }

    private tabShellCommands(container_element: HTMLElement) {
        // A <div> element for all command input fields. New command fields can be created at the bottom of this element.
        const command_fields_container = container_element.createEl("div");

        // Fields for modifying existing commands
        for (const command_id in this.plugin.getTShellCommands()) {
            createShellCommandField(this.plugin, command_fields_container, command_id, this.plugin.settings.show_autocomplete_menu);
        }

        // "New command" button
        new Setting(container_element)
            .addButton(button => button
                .setButtonText("New command")
                .onClick(async () => {
                    createShellCommandField(this.plugin, command_fields_container, "new", this.plugin.settings.show_autocomplete_menu);
                    debugLog("New empty command created.");
                })
            )
        ;
    }

    private tabEvents(container_element: HTMLElement) {

        // A general description about events
        container_element.createEl("p", {text: "Events introduce a way to execute shell commands automatically in certain situations, e.g. when Obsidian starts. They are set up for each shell command separately, but this tab contains general options for them."});

        // Enable/disable all events
        new Setting(container_element)
            .setName("Enable events")
            .setDesc("This is a quick way to immediately turn off all events, if you want.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enable_events)
                .onChange(async (enable_events: boolean) => {
                    // The toggle was clicked.
                    this.plugin.settings.enable_events = enable_events;
                    if (enable_events) {
                        // Register events.
                        this.plugin.registerSC_Events(true);
                    } else {
                        // Unregister events.
                        this.plugin.unregisterSC_Events();
                    }
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // A list of current enable events
        container_element.createEl("p", {text: "The following gives just a quick glance over which events are enabled on which shell commands. To enable/disable events for a shell command, go to the particular shell command's settings via the 'Shell commands' tab. The list is only updated when you reopen the whole settings panel."});
        let found_enabled_event = false;
        getSC_Events(this.plugin).forEach((sc_event: SC_Event) => {
            const event_enabled_t_shell_commands = sc_event.getTShellCommands();
            // Has the event been enabled for any shell commands?
            if (event_enabled_t_shell_commands.length) {
                // Yes, it's enabled.
                // Show a list of shell commands
                const paragraph_element = container_element.createEl("p", {text: sc_event.static().getTitle()});
                const list_element = paragraph_element.createEl("ul");
                event_enabled_t_shell_commands.forEach((t_shell_command: TShellCommand) => {
                    list_element.createEl("li", {text: t_shell_command.getAliasOrShellCommand()})
                });
                found_enabled_event = true;
            }
        });
        if (!found_enabled_event) {
            container_element.createEl("p", {text: "No events are enabled for any shell commands."});
        }
    }

    private tabVariables(container_element: HTMLElement)
    {
        // "Preview variables in command palette" field
        new Setting(container_element)
            .setName("Preview variables in command palette and menus")
            .setDesc("If on, variable names are substituted with their realtime values when you view your commands in the command palette and right click context menus (if used). A nice way to ensure your commands will use correct values.")
            .addToggle(checkbox => checkbox
                .setValue(this.plugin.settings.preview_variables_in_command_palette)
                .onChange(async (value: boolean) => {
                    debugLog("Changing preview_variables_in_command_palette to " + value);
                    this.plugin.settings.preview_variables_in_command_palette = value;
                    await this.plugin.saveSettings();
                })
            )
        ;

        // "Show autocomplete menu" field
        new Setting(container_element)
            .setName("Show autocomplete menu")
            .setDesc("If on, a dropdown menu shows up when you begin writing {{variable}} names, showing matching variables and their instructions. Also allows defining custom suggestions in autocomplete.yaml file - see the documentation.")
            .addToggle(checkbox => checkbox
                .setValue(this.plugin.settings.show_autocomplete_menu)
                .onChange(async (value: boolean) => {
                    debugLog("Changing show_autocomplete_menu to " + value);
                    this.plugin.settings.show_autocomplete_menu = value;
                    this.display(); // Re-render the whole settings view to apply the change.
                    await this.plugin.saveSettings();
                }),
            )
            .addExtraButton(extra_button => extra_button
                .setIcon("help")
                .setTooltip("Documentation: Autocomplete")
                .onClick(() => {
                    gotoURL(DocumentationAutocompleteLink)
                }),
            )
        ;

        // Custom variables
        new Setting(container_element)
            .setName("Custom variables")
            .setHeading() // Make the "Variables" text bold.
            .addExtraButton(extra_button => extra_button
                .setIcon("pane-layout")
                .setTooltip("Open a pane that displays all custom variables and their values.")
                .onClick(() => {
                    this.plugin.createCustomVariableView();
                }),
            )
            .addExtraButton(extra_button => extra_button
                .setIcon("help")
                .setTooltip("Documentation: Custom variables")
                .onClick(() => {
                    gotoURL(DocumentationCustomVariablesLink);
                }),
            )
        ;

        // Settings for each CustomVariable
        const custom_variable_model = getModel<CustomVariableModel>(CustomVariableModel.name);
        const custom_variable_container = container_element.createDiv();
        this.plugin.getCustomVariableInstances().forEach((custom_variable_instance: CustomVariableInstance) => {
            custom_variable_model.createSettingFields(custom_variable_instance, custom_variable_container);
        });
        createNewModelInstanceButton<CustomVariableModel, CustomVariableInstance>(this.plugin, CustomVariableModel.name, container_element, custom_variable_container, this.plugin.settings).then();


        // Built-in variable instructions
        new Setting(container_element)
            .setName("Built-in variables")
            .setHeading() // Make the "Variables" text bold.
            .addExtraButton(extra_button => extra_button
                .setIcon("help")
                .setTooltip("Documentation: Built-in variables")
                .onClick(() => {
                    gotoURL(DocumentationBuiltInVariablesLink)
                }),
            )
        ;

        const variables = this.plugin.getVariables();
        variables.forEach((variable: Variable) => {
            if (!(variable instanceof CustomVariable)) {
                const paragraph = container_element.createEl("p");
                paragraph.insertAdjacentHTML("afterbegin",
                    variable.getHelpName() +
                    "<br>" +
                    variable.help_text
                );
                const availability_text: string = variable.getAvailabilityText();
                if (availability_text) {
                    paragraph.insertAdjacentHTML("beforeend", "<br>" + availability_text);
                }
            }
        });

        container_element.createEl("p", {text: "When you type variables into commands, a preview text appears under the command field to show how the command will look like when it gets executed with variables substituted with their real values."});
        container_element.createEl("p", {text: "Special characters in variable values are tried to be escaped (except if you use CMD as the shell in Windows). This is to improve security so that a variable won't accidentally cause bad things to happen. If you want to use a raw, unescaped value, add an exclamation mark before the variable's name, e.g. {{!title}}, but be careful, it's dangerous!"});
        container_element.createEl("p", {text: "There is no way to prevent variable parsing. If you need {{ }} characters in your command, they won't be parsed as variables as long as they do not contain any of the variable names listed below. If you would need to pass e.g. {{title}} literally to your command, there is no way to do it atm, please raise an issue in GitHub."});
        container_element.createEl("p", {text: "All variables that access the current file, may cause the command preview to fail if you had no file panel active when you opened the settings window - e.g. you had focus on graph view instead of a note = no file is currently active. But this does not break anything else than the preview."});
    }

    private tabEnvironments(container_element: HTMLElement) {
        // "Working directory" field
        new Setting(container_element)
            .setName("Working directory")
            .setDesc("A directory where your commands will be run. If empty, defaults to your vault's location. Can be relative (= a folder in the vault) or absolute (= complete from filesystem root).")
            .addText(text => text
                .setPlaceholder(getVaultAbsolutePath(this.app))
                .setValue(this.plugin.settings.working_directory)
                .onChange(async (value) => {
                    debugLog("Changing working_directory to " + value);
                    this.plugin.settings.working_directory = value;
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Platforms' default shells
        createShellSelectionField(this.plugin, container_element, this.plugin.settings.default_shells, true);
    }

    private tabPreactions(container_element: HTMLElement) {

        // Prompts
        const prompt_model = getModel<PromptModel>(PromptModel.name);
        new Setting(container_element)
            .setName("Prompts")
            .setHeading() // Make the "Prompts" text to appear as a heading.
        ;
        const prompts_container_element = container_element.createDiv();
        this.plugin.getPrompts().forEach((prompt: Prompt) => {
            prompt_model.createSettingFields(prompt, prompts_container_element);
        });

        // 'New prompt' button
        const new_prompt_button_promise = createNewModelInstanceButton<PromptModel, Prompt>(this.plugin, PromptModel.name, container_element, prompts_container_element, this.plugin.settings);
        new_prompt_button_promise.then((result: {instance: Prompt, main_setting: Setting}) => {
            prompt_model.openSettingsModal(result.instance, result.main_setting); // Open the prompt settings modal, as the user will probably want to configure it now anyway.
        });
    }

    private tabOutput(container_element: HTMLElement) {
        // "Error message duration" field
        this.createNotificationDurationField(container_element, "Error message duration", "Concerns messages about failed shell commands.", "error_message_duration");

        // "Notification message duration" field
        this.createNotificationDurationField(container_element, "Notification message duration", "Concerns informational, non fatal messages, e.g. output directed to 'Notification balloon'.", "notification_message_duration");

        // "Output channel 'Clipboard' displays a notification message, too" field
        new Setting(container_element)
            .setName("Output channel 'Clipboard' displays a notification message, too")
            .setDesc("If a shell command's output is directed to the clipboard, also show the output in a popup box on the top right corner. This helps to notice what was inserted into clipboard.")
            .addToggle(checkbox => checkbox
                .setValue(this.plugin.settings.output_channel_clipboard_also_outputs_to_notification)
                .onChange(async (value: boolean) => {
                    this.plugin.settings.output_channel_clipboard_also_outputs_to_notification = value;
                    await this.plugin.saveSettings();
                }),
            )
        ;
    }

    private createNotificationDurationField(container_element: HTMLElement, title: string, description: string, setting_name: "error_message_duration" | "notification_message_duration") {
        new Setting(container_element)
            .setName(title)
            .setDesc(description + " In seconds, between 1 and 180.")
            .addText(field => field
                .setValue(String(this.plugin.settings[setting_name]))
                .onChange(async (duration_string: string) => {
                    const duration: number = parseInt(duration_string);
                    if (duration >= 1 && duration <= 180) {
                        debugLog("Change " + setting_name + " from " + this.plugin.settings[setting_name] + " to " + duration);
                        this.plugin.settings[setting_name] = duration;
                        await this.plugin.saveSettings();
                        debugLog("Changed.");
                    }
                    // Don't show a notice if duration is not between 1 and 180, because this function is called every time a user types in this field, so the value might not be final.
                })
            )
        ;
    }

    private last_position: {
        scroll_position: number;
        tab_name: string;
    } = {
        scroll_position: 0,
        tab_name: "main-shell-commands",
    };
    private rememberLastPosition(container_element: HTMLElement) {
        const last_position = this.last_position;

        // Go to last position now
        this.tab_structure.buttons[last_position.tab_name].click();
        container_element.scrollTo({
            top: this.last_position.scroll_position,
            behavior: "auto",
        });

        // Listen to changes
        container_element.addEventListener("scroll", (event) => {
            this.last_position.scroll_position = container_element.scrollTop;
        });
        for (const tab_name in this.tab_structure.buttons) {
            const button = this.tab_structure.buttons[tab_name];
            button.onClickEvent((event: MouseEvent) => {
                last_position.tab_name = tab_name;
            });
        }
    }
}

export interface SettingFieldGroup {
    name_setting: Setting;
    shell_command_setting: Setting;
    preview_setting: Setting;
}