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

// @ts-ignore
import {Setting, TextAreaComponent} from "obsidian";
import SC_Plugin from "../main";
import {SC_MainSettingsTab} from "./SC_MainSettingsTab";
import {getOutputChannelDriversOptionList} from "../output_channels/OutputChannelDriverFunctions";
import {
    OutputChannelCode,
    OutputChannelOrder,
    OutputHandlingMode,
    OutputStream,
} from "../output_channels/OutputChannelCode";
import {TShellCommand} from "../TShellCommand";
import {CommandPaletteOptions, ICommandPaletteOptions, PlatformId, PlatformNames} from "./SC_MainSettings";
import {createShellSelectionField} from "./setting_elements/CreateShellSelectionField";
import {
    generateIgnoredErrorCodesIconTitle,
    generateShellCommandFieldIconAndName
} from "./setting_elements/CreateShellCommandField";
import {createPlatformSpecificShellCommandField} from "./setting_elements/CreatePlatformSpecificShellCommandField";
import {createTabs, TabStructure} from "./setting_elements/Tabs";
import {createAutocomplete} from "./setting_elements/Autocomplete";
import {getSC_Events} from "../events/SC_EventList";
import {SC_Event} from "../events/SC_Event";
import {
    copyToClipboard,
    gotoURL,
} from "../Common";
import {SC_Modal} from "../SC_Modal";
import {
    getDefaultPreaction_Prompt_Configuration,
    getModel,
    Preaction_Prompt_Configuration,
    PreactionConfiguration,
    Prompt,
    PromptModel,
    PromptSettingsModal,
} from "../imports";
import {VariableDefaultValueConfiguration} from "../variables/Variable";
import {CmdOrCtrl} from "../Hotkeys";
import {
    getIconHTML,
    ICON_LIST_SORTED_UNIQUE,
} from "../Icons";
import {OutputWrapper} from "../models/output_wrapper/OutputWrapper";
import {OutputWrapperModel} from "../models/output_wrapper/OutputWrapperModel";
import {OutputWrapperSettingsModal} from "../models/output_wrapper/OutputWrapperSettingsModal";

/**
 * TODO: Rename to ShellCommandSettingsModal
 */
export class ExtraOptionsModal extends SC_Modal {
    public static GENERAL_OPTIONS_SUMMARY = "Alias, Icon, Confirmation";
    public static PREACTIONS_OPTIONS_SUMMARY = "Preactions: Prompt for asking values from user";
    public static OUTPUT_OPTIONS_SUMMARY = "Stdout/stderr handling, Ignore errors";
    public static ENVIRONMENTS_OPTIONS_SUMMARY = "Shell selection, Operating system specific shell commands";
    public static EVENTS_SUMMARY = "Events";
    public static VARIABLES_SUMMARY = "Default values for variables";

    private readonly shell_command_id: string;
    private readonly t_shell_command: TShellCommand;
    private name_setting: Setting;
    private setting_tab: SC_MainSettingsTab;
    private tab_structure: TabStructure;

    constructor(plugin: SC_Plugin, shell_command_id: string, setting_tab: SC_MainSettingsTab) {
        super(plugin);
        this.shell_command_id = shell_command_id;
        this.t_shell_command = plugin.getTShellCommands()[shell_command_id];
        this.name_setting = setting_tab.setting_groups[shell_command_id].name_setting;
        this.setting_tab = setting_tab;
    }

    public onOpen() {
        super.onOpen();

        this.modalEl.createEl("h2", {text: this.t_shell_command.getDefaultShellCommand()});  // TODO: Use this.setTitle() instead.

        // Tabs
        this.tab_structure = createTabs(this.modalEl, {
            "extra-options-general": {
                title: "General",
                icon: "gear",
                content_generator: (container_element: HTMLElement) => {
                    this.tabGeneral(container_element);
                },
            },
            "extra-options-preactions": {
                title: "Preactions",
                icon: "note-glyph",
                content_generator: (container_element: HTMLElement) => {
                    this.tabPreactions(container_element);
                },
            },
            "extra-options-output": {
                title: "Output",
                icon: "lines-of-text",
                content_generator: (container_element: HTMLElement) => {
                    this.tabOutput(container_element);
                },
            },
            "extra-options-environments": {
                title: "Environments",
                icon: "stacked-levels",
                content_generator: (container_element: HTMLElement) => {
                    this.tabEnvironments(container_element);
                },
            },
            "extra-options-events": {
                title: "Events",
                icon: "dice",
                content_generator: (container_element: HTMLElement) => {
                    this.tabEvents(container_element);
                },
            },
            "extra-options-variables": {
                title: "Variables",
                icon: "code-glyph",
                content_generator: (container_element: HTMLElement) => {
                    this.tabVariables(container_element);
                },
            },
        });

        // Hotkeys for moving to next/previous shell command
        const switch_to_t_shell_command = (t_shell_command: TShellCommand) => {
            const new_modal = new ExtraOptionsModal(this.plugin, t_shell_command.getId(), this.setting_tab);
            this.close(); // Needs to be closed before the new one is opened, otherwise the new one's tab content won't be shown.
            new_modal.open();
            new_modal.activateTab(this.tab_structure.active_tab_id);
        };
        this.scope.register(["Mod"], "ArrowUp", () => {
            if (this.t_shell_command.previousTShellCommand()) {
                switch_to_t_shell_command(this.t_shell_command.previousTShellCommand());
            }
        });
        this.scope.register(["Mod"], "ArrowDown", () => {
            if (this.t_shell_command.nextTShellCommand()) {
                switch_to_t_shell_command(this.t_shell_command.nextTShellCommand());
            }
        });
        new Setting(this.modalEl)
            .setDesc("Tip! Hit " + CmdOrCtrl() + " + up/down to switch to previous/next shell command.")
        ;
    }

    private tabGeneral(container_element: HTMLElement) {
        // Alias field
        const alias_container = container_element.createDiv({attr: {class: "SC-setting-group"}})
        new Setting(alias_container)
            .setName("Alias")
        ;
        const on_alias_change = async (value: string) => {
            // Change the actual alias value
            this.t_shell_command.getConfiguration().alias = value;

            // Update Obsidian command palette
            this.t_shell_command.renameObsidianCommand(this.t_shell_command.getShellCommand(), this.t_shell_command.getAlias());

            // UpdateShell commands settings panel
            this.name_setting.nameEl.innerHTML = generateShellCommandFieldIconAndName(this.t_shell_command);

            // Save
            await this.plugin.saveSettings();
        };
        const alias_setting = new Setting(alias_container)
            .addText(text => text
                .setValue(this.t_shell_command.getAlias())
                .onChange(on_alias_change)
            )
            .setClass("SC-no-description")
        ;
        const alias_input_element: HTMLInputElement = alias_setting.controlEl.find("input") as HTMLInputElement;
        alias_input_element.addClass("SC-focus-element-on-tab-opening"); // Focus without a need to click the field.
        if (this.plugin.settings.show_autocomplete_menu) {
            // Show autocomplete menu (= a list of available variables).
            createAutocomplete(this.plugin, alias_input_element, on_alias_change);
        }

        alias_container.createEl("p", {text: "If not empty, the alias will be displayed in the command palette instead of the actual command. An alias is never executed as a command."});
        alias_container.createEl("p", {text: "You can also use the same {{}} style variables in aliases that are used in shell commands. When variables are used in aliases, they do not affect the command execution in any way, but it's a nice way to reveal what values your command will use, even when an alias hides most of the other technical details. Starting a variable with {{! will prevent escaping special characters in command palette."});

        // Icon field
        const current_icon = this.t_shell_command.getConfiguration().icon;
        const icon_setting = new Setting(container_element)
            .setDesc("If defined, the icon will be shown in file menu, folder menu, and editor menu in front of the alias text. It's also shown in the settings. It makes it easier to distinguish different shell commands visually from each other.")
            .addDropdown(dropdown => dropdown
                .addOption("no-icon", "No icon") // Need to use a non-empty string like "no-icon", because if 'value' would be "" then it becomes the same as 'display' from some reason, i.e. "No icon".
                .then((dropdown) => {
                    // Iterate all available icons.
                    for (const icon_id of ICON_LIST_SORTED_UNIQUE) {
                        // Create an option for the icon.
                        dropdown.addOption(icon_id, icon_id);
                    }
                    dropdown.setValue(current_icon ?? ""); // "" == the 'No icon' option.
                })
                .onChange(async (new_icon) => {
                    if ("no-icon" === new_icon) {
                        // Disable icon
                        this.t_shell_command.getConfiguration().icon = null;

                        // Remove the icon from the modal
                        icon_setting.nameEl.innerHTML = "Icon";
                    } else {
                        // Set or change the icon
                        this.t_shell_command.getConfiguration().icon = new_icon;

                        // Update the icon in the modal
                        icon_setting.nameEl.innerHTML = "Icon " + getIconHTML(new_icon);
                    }

                    // Update (or remove) the icon in the main settings panel
                    this.name_setting.nameEl.innerHTML = generateShellCommandFieldIconAndName(this.t_shell_command);

                    // Save settings
                    await this.plugin.saveSettings();
                }),
            )
        ;
        icon_setting.nameEl.innerHTML = "Icon " + getIconHTML(current_icon)

        // Confirm execution field
        new Setting(container_element)
            .setName("Ask confirmation before execution")
            .addToggle(toggle => toggle
                .setValue(this.t_shell_command.getConfirmExecution())
                .onChange(async (value) => {
                    this.t_shell_command.getConfiguration().confirm_execution = value;
                    const icon_container = this.name_setting.nameEl.find("span.shell-commands-confirm-execution-icon-container");
                    if (this.t_shell_command.getConfirmExecution()) {
                        // Show icon
                        icon_container.removeClass("SC-hide");
                    } else {
                        // Hide icon
                        icon_container.addClass("SC-hide");
                    }
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Shell command id
        new Setting(container_element)
            .setDesc(`Shell command id: ${this.shell_command_id}`)
            .addExtraButton(button => button
                .setIcon("documents")
                .setTooltip(`Copy ${this.shell_command_id} to the clipboard.`)
                .onClick(() => {
                    copyToClipboard(this.shell_command_id);
                    this.plugin.newNotification(`${this.shell_command_id} was copied to the clipboard.`)
                }),
            )
        ;
        if (this.t_shell_command.canAddToCommandPalette()) {
            // Only show Obsidian command palette id if the shell command is available in the command palette.
            const obsidian_command_id = this.t_shell_command.getObsidianCommand().id;
            new Setting(container_element)
                .setDesc(`Obsidian command palette id: ${obsidian_command_id}`)
                .addExtraButton(button => button
                    .setIcon("documents")
                    .setTooltip(`Copy ${obsidian_command_id} to the clipboard.`)
                    .onClick(() => {
                        copyToClipboard(obsidian_command_id);
                        this.plugin.newNotification(`${obsidian_command_id} was copied to the clipboard.`)
                    }),
                )
                .settingEl.addClass("SC-no-top-border") // No horizontal ruler between the two id elements.
            ;
        }
    }

    private tabPreactions(container_element: HTMLElement) {
        container_element.createEl("p", {text: "Preactions are performed before the actual shell command gets executed, to do certain preparations for the shell command."});
        const preactions_configuration = this.t_shell_command.getConfiguration().preactions;

        // Load config values
        let preaction_prompt_configuration: Preaction_Prompt_Configuration = null;
        preactions_configuration.forEach((preaction_configuration: PreactionConfiguration) => {
            switch (preaction_configuration.type) {
                case "prompt":
                    preaction_prompt_configuration = preaction_configuration as Preaction_Prompt_Configuration;
            }
        });

        // Preaction: Prompt
        const prompt_options: {[key: string]: string} = {};
        this.plugin.getPrompts().forEach((prompt: Prompt) => {
            prompt_options[prompt.getID()] = prompt.getTitle();
        });
        let old_selected_prompt_option: string = (preaction_prompt_configuration?.enabled) ? preaction_prompt_configuration.prompt_id : "no-prompt";
        new Setting(container_element)
            .setName("Prompt")
            .setDesc("Prompts are used to ask values from the user right before shell command execution. The values can be accessed in the shell command via custom variables. You can manage all prompts in the plugin's main settings view, under the 'Preactions' tab.")
            .addDropdown(dropdown => dropdown
                .addOption("no-prompt", "No prompt")
                .addOptions(prompt_options)
                .addOption("new", "Create a new prompt")
                .setValue(old_selected_prompt_option)
                .onChange(async (new_prompt_id: string) => {
                    // Create a PreactionPromptConfiguration if it does not exist.
                    if (!preaction_prompt_configuration) {
                        preaction_prompt_configuration = getDefaultPreaction_Prompt_Configuration();
                        preactions_configuration.push(preaction_prompt_configuration);
                        this.t_shell_command.resetPreactions();
                    }

                    // Interpret the selection
                    switch (new_prompt_id) {
                        case "new": {
                            // Create a new Prompt.
                            const model = getModel<PromptModel>(PromptModel.name)
                            const new_prompt = model.newInstance(this.plugin.settings);
                            this.plugin.saveSettings().then(() => {
                                const modal = new PromptSettingsModal(
                                    this.plugin,
                                    new_prompt,
                                    null,
                                    "Create prompt",
                                    async () => {
                                        // Prompt is created.
                                        dropdown.addOption(new_prompt.getID(), new_prompt.getTitle());
                                        dropdown.setValue(new_prompt.getID());
                                        preaction_prompt_configuration.enabled = true;
                                        preaction_prompt_configuration.prompt_id = new_prompt.getID();
                                        await this.plugin.saveSettings();
                                        old_selected_prompt_option = dropdown.getValue();
                                    },
                                    async () => {
                                        // Prompt creation was cancelled.
                                        dropdown.setValue(old_selected_prompt_option); // Reset the dropdown selection.
                                        model.deleteInstance(new_prompt);
                                        await this.plugin.saveSettings();
                                    },
                                );
                                modal.open();
                            });
                            break;
                        } case "no-prompt": {
                            // Disable the prompt.
                            preaction_prompt_configuration.enabled = false;
                            this.t_shell_command.resetPreactions();
                            await this.plugin.saveSettings();
                            old_selected_prompt_option = dropdown.getValue();
                            break;
                        } default: {
                            // Use an existing prompt.
                            preaction_prompt_configuration.enabled = true;
                            preaction_prompt_configuration.prompt_id = new_prompt_id;
                            await this.plugin.saveSettings();
                            old_selected_prompt_option = dropdown.getValue();
                            break;
                        }
                    }
                }),
            )
        ;
    }

    private tabOutput(container_element: HTMLElement) {
        // Output channeling
        const stdout_channel_setting = this.newOutputChannelSetting(container_element, "Output channel for stdout", "stdout");
        this.newOutputChannelSetting(container_element, "Output channel for stderr", "stderr", "If both stdout and stderr use the same channel, stderr will be combined to same message with stdout.");

        // Output wrappers
        this.newOutputWrapperSetting(container_element, "Output wrapper for stdout", "stdout", "Output wrappers can be used to surround output with predefined text, e.g. to put output into a code block. Note: If 'Output mode' is 'Realtime', wrappers will probably appear multiple times in output!");
        this.newOutputWrapperSetting(container_element, "Output wrapper for stderr", "stderr");

        // Output handling mode
        new Setting(container_element)
            .setName("Output handling")
            .setDesc("Set to 'Realtime' if your shell command runs for a long time AND you want output handling to start as soon as any outputted content is available. Output channels might be used multiple times during a single process. 'Wait until finished' postpones output handling until all output is received, and handles it as a single bunch. If uncertain, use the traditional 'Wait until finished'.")
            .addDropdown(dropdown => dropdown
                .addOptions({
                    "buffered": "Wait until finished",
                    "realtime": "Realtime (experimental)",
                })
                .setValue(this.t_shell_command.getConfiguration().output_handling_mode)
                .onChange(async (newMode: string) => {
                    this.t_shell_command.getConfiguration().output_handling_mode = newMode as OutputHandlingMode;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Order of output channels
        new Setting(container_element)
            .setName("Order of stdout/stderr output")
            .setDesc("When output contains both errors and normal output, which one should be presented first? (Only matters if 'Output handling' is 'Wait until finished').")
            .addDropdown(dropdown => dropdown
                .addOptions({
                    "stdout-first": "Stdout first, then stderr.",
                    "stderr-first": "Stderr first, then stdout.",
                })
                .setValue(this.t_shell_command.getOutputChannelOrder())
                .onChange(async (value: OutputChannelOrder) => {
                    this.t_shell_command.getConfiguration().output_channel_order = value;
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Focus on the stdout channel dropdown field
        stdout_channel_setting.controlEl.find("select").addClass("SC-focus-element-on-tab-opening");

        // Ignore errors field
        new Setting(container_element)
            .setName("Ignore error codes")
            .setDesc("A comma separated list of numbers. If executing a shell command fails with one of these exit codes, no error message will be displayed, and the above stderr channel will be ignored. Stdout channel will still be used for stdout. Error codes must be integers and greater than or equal to 0. Anything else will be removed. Note: If 'Output handling' is 'Realtime', no exit code based ignoring can be done, as an error code is only received when a shell command process finishes.")
            .addText(text => text
                .setValue(this.t_shell_command.getIgnoreErrorCodes().join(","))
                .onChange(async (value) => {
                    // Parse the string of comma separated numbers
                    const ignore_error_codes: number[] = [];
                    const raw_error_codes = value.split(",");
                    for (const i in raw_error_codes) {
                        const raw_error_code = raw_error_codes[i];
                        const error_code_candidate = parseInt(raw_error_code.trim()); // E.g. an empty string converts to NaN (= Not a Number).
                        // Ensure that the error code is not NaN, 0 or a negative number.
                        if (!isNaN(error_code_candidate) && error_code_candidate >= 0) {
                            // The candidate is legit.
                            ignore_error_codes.push(error_code_candidate);
                        }
                    }

                    // Save the validated error numbers
                    this.t_shell_command.getConfiguration().ignore_error_codes = ignore_error_codes;
                    await this.plugin.saveSettings();

                    // Update icon
                    const icon_container = this.name_setting.nameEl.find("span.shell-commands-ignored-error-codes-icon-container");
                    if (this.t_shell_command.getIgnoreErrorCodes().length) {
                        // Show icon
                        icon_container.setAttr("aria-label", generateIgnoredErrorCodesIconTitle(this.t_shell_command.getIgnoreErrorCodes()));
                        icon_container.removeClass("SC-hide");
                    } else {
                        // Hide icon
                        icon_container.addClass("SC-hide");
                    }
                })
            )
        ;
    }

    private tabEnvironments(container_element: HTMLElement) {
        // Platform specific shell commands
        let platform_id: PlatformId;
        let is_first = true;
        for (platform_id in PlatformNames) {
            const setting_group = createPlatformSpecificShellCommandField(this.plugin, container_element, this.t_shell_command, platform_id, this.plugin.settings.show_autocomplete_menu);
            if (is_first) {
                // Focus on the first OS specific shell command field
                setting_group.shell_command_setting.controlEl.find("textarea").addClass("SC-focus-element-on-tab-opening");
                is_first = false;
            }
        }

        // Platform specific shell selection
        createShellSelectionField(this.plugin, container_element, this.t_shell_command.getShells(), false);
    }

    private tabEvents(container_element: HTMLElement) {
        // Command palette
        const command_palette_availability_setting = new Setting(container_element)
            .setName("Availability in Obsidian's command palette")
            .addDropdown(dropdown => dropdown
                .addOptions(CommandPaletteOptions)
                .setValue(this.t_shell_command.getConfiguration().command_palette_availability)
                .onChange(async (value: keyof ICommandPaletteOptions) => {

                    // Store value
                    this.t_shell_command.getConfiguration().command_palette_availability = value;

                    // Update command palette
                    if (this.t_shell_command.canAddToCommandPalette()) {
                        // Register to command palette
                        this.t_shell_command.registerToCommandPalette();
                    } else {
                        // Unregister from command palette
                        this.t_shell_command.unregisterFromCommandPalette();
                    }

                    // Save
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Focus on the command palette availability field
        command_palette_availability_setting.controlEl.find("select").addClass("SC-focus-element-on-tab-opening");

        // Events
        new Setting(container_element)
            .setName("Execute this shell command automatically when:")
            .setHeading() // Make the name bold
        ;
        getSC_Events(this.plugin).forEach((sc_event: SC_Event) => {
            const is_event_enabled: boolean = this.t_shell_command.isSC_EventEnabled(sc_event.static().getCode());
            const summary_of_extra_variables = sc_event.getSummaryOfEventVariables();
            new Setting(container_element)
                .setName(sc_event.static().getTitle())
                .setDesc(summary_of_extra_variables ? "Additional variables: " + summary_of_extra_variables : "")
                .addToggle(toggle => toggle
                    .setValue(is_event_enabled)
                    .onChange(async (enable: boolean) => {
                        if (enable) {
                            // Enable the event
                            this.t_shell_command.enableSC_Event(sc_event);
                            extra_settings_container.style.display = "block"; // Show extra settings
                        } else {
                            // Disable the event
                            this.t_shell_command.disableSC_Event(sc_event);
                            extra_settings_container.style.display = "none"; // Hide extra settings
                        }
                        // Save
                        await this.plugin.saveSettings();
                    }),
                )

                // Documentation icon
                .addExtraButton(icon => icon
                    .setIcon("help")
                    .onClick(() => gotoURL(sc_event.static().getDocumentationLink()))
                    .setTooltip("Documentation: " + sc_event.static().getTitle() + " event"),
                )
            ;

            // Extra settings
            const extra_settings_container = container_element.createDiv();
            extra_settings_container.style.display = is_event_enabled ? "block" : "none";
            sc_event.createExtraSettingsFields(extra_settings_container, this.t_shell_command);
        });
    }

    private tabVariables(container_element: HTMLElement) {

        // Default values for variables
        new Setting(container_element)
            .setName("Default values for variables")
            .setDesc("Certain variables can be inaccessible during certain situations, e.g. {{file_name}} is not available when no file pane is focused. You can define default values that will be used when a variable is otherwise unavailable.")
            .setHeading()
        ;

        // Add default value fields for each variable that can have a default value.
        for (const variable of this.plugin.getVariables()) {
            // Only add fields for variables that are not always accessible.
            if (!variable.isAlwaysAvailable()) {

                // Get an identifier for a variable (an id, if it's a CustomVariable, otherwise the variable's name).
                const variable_identifier = variable.getIdentifier();

                // If a default value has defined for this variable (and this TShellCommand), retrieve the configuration.
                let default_value_configuration: VariableDefaultValueConfiguration | undefined = this.t_shell_command.getDefaultValueConfigurationForVariable(variable); // NOTE that this can be UNDEFINED!

                // A function for creating configuration in onChange() callbacks if the variable does not yet have one for this TShellCommand.
                const create_default_value_configuration = () => {
                    const configuration: VariableDefaultValueConfiguration = {
                        type: "show-errors",
                        value: "",
                    };
                    this.t_shell_command.getConfiguration().variable_default_values[variable_identifier] = configuration;
                    return configuration;
                }

                let textarea_component: TextAreaComponent;

                // A function for updating textarea_component visibility.
                const update_textarea_component_visibility = (type: string) => {
                    if ("value" === type) {
                        textarea_component.inputEl.removeClass("SC-hide");
                    } else {
                        textarea_component.inputEl.addClass("SC-hide");
                    }
                };

                // Create the default value setting
                new Setting(container_element)
                    .setName(variable.getFullName())
                    .setDesc("If not available, then:")
                    .setTooltip(variable.getAvailabilityTextPlain())
                    .addDropdown(dropdown => dropdown
                        .addOptions({
                            "show-errors": "Cancel execution and show errors",
                            "cancel-silently": "Cancel execution silently",
                            "value": "Execute with value:",
                        })
                        .setValue(default_value_configuration ? default_value_configuration.type : "show-errors")
                        .onChange(async (new_type: typeof default_value_configuration.type) => {
                            if (!default_value_configuration) {
                                default_value_configuration = create_default_value_configuration();
                            }

                            // Set the new type
                            default_value_configuration.type = new_type;
                            if ("show-errors" === new_type && default_value_configuration.value === "") {
                                // If "show-errors" is selected and no text value is typed, the configuration file can be cleaned up by removing this configuration object completely.
                                // Prevent deleting, if a text value is present, because the user might want to keep it if they will later change 'type' to 'value'.
                                delete this.t_shell_command.getConfiguration().variable_default_values[variable_identifier];
                            }

                            // Show/hide the textarea
                            update_textarea_component_visibility(new_type);

                            // Save the settings
                            await this.plugin.saveSettings();
                        }),
                    )
                    .addTextArea(textarea => textarea_component = textarea
                        .setValue(default_value_configuration ? default_value_configuration.value : "")
                        .onChange(async (new_value: string) => {
                            if (!default_value_configuration) {
                                default_value_configuration = create_default_value_configuration();
                            }

                            // Set the new text value
                            default_value_configuration.value = new_value;

                            // Save the settings
                            await this.plugin.saveSettings();
                        }).then((textarea_component) => {
                            // Autocomplete for the textarea.
                            if (this.plugin.settings.show_autocomplete_menu) {
                                createAutocomplete(this.plugin, textarea_component.inputEl, () => textarea_component.onChanged());
                            }
                        }),
                    )
                ;
                update_textarea_component_visibility(default_value_configuration ? default_value_configuration.type : "show-errors");
            }
        }
    }

    public activateTab(tab_id: string) {
        if (undefined === this.tab_structure.buttons[tab_id]) {
            throw Error("Invalid tab id: " + tab_id);
        }
        this.tab_structure.buttons[tab_id].click();
    }

    private newOutputChannelSetting(container_element: HTMLElement, title: string, output_stream_name: OutputStream, description = "") {
        const output_channel_options = getOutputChannelDriversOptionList(output_stream_name);
        return new Setting(container_element)
            .setName(title)
            .setDesc(description)
            .addDropdown(dropdown => dropdown
                .addOptions(output_channel_options)
                .setValue(this.t_shell_command.getOutputChannels()[output_stream_name])
                .onChange(async (value: OutputChannelCode) => {
                    this.t_shell_command.getConfiguration().output_channels[output_stream_name] = value;
                    await this.plugin.saveSettings();
                })
            )
        ;
    }

    private newOutputWrapperSetting(container_element: HTMLElement, title: string, output_stream_name: OutputStream, description = "") {
        const output_wrapper_options: {[key: string]: string} = {};
        this.plugin.getOutputWrappers().forEach((output_wrapper: OutputWrapper) => {
            output_wrapper_options[output_wrapper.getID()] = output_wrapper.getTitle();
        });
        const output_wrappers = this.t_shell_command.getConfiguration().output_wrappers;
        let old_selected_output_wrapper_option: string = (output_wrappers[output_stream_name]) ? output_wrappers[output_stream_name] : "no-output-wrapper";
        return new Setting(container_element)
            .setName(title)
            .setDesc(description)
            .addDropdown(dropdown_component => dropdown_component
                .addOption("no-output-wrapper", "No "+output_stream_name+" wrapper")
                .addOptions(output_wrapper_options)
                .addOption("new", "Create a new output wrapper")
                .setValue(old_selected_output_wrapper_option)
                .onChange(async (output_wrapper_id: string) => {
                    switch (output_wrapper_id) {
                        case "new": {
                            // Create a new OutputWrapper.
                            const output_wrapper_model = getModel<OutputWrapperModel>(OutputWrapperModel.name);
                            const new_output_wrapper = output_wrapper_model.newInstance(this.plugin.settings);
                            this.plugin.saveSettings().then(() => {
                                const modal = new OutputWrapperSettingsModal(
                                    this.plugin,
                                    new_output_wrapper,
                                    null,
                                    "Create output wrapper",
                                    async () => {
                                        // Output wrapper is created.
                                        dropdown_component.addOption(new_output_wrapper.getID(), new_output_wrapper.getTitle());
                                        dropdown_component.setValue(new_output_wrapper.getID());
                                        output_wrappers[output_stream_name] = new_output_wrapper.getID();
                                        await this.plugin.saveSettings();
                                        old_selected_output_wrapper_option = dropdown_component.getValue();
                                    },
                                    async () => {
                                        // Prompt creation was cancelled.
                                        dropdown_component.setValue(old_selected_output_wrapper_option); // Reset the dropdown selection.
                                        output_wrapper_model.deleteInstance(new_output_wrapper);
                                        await this.plugin.saveSettings();
                                    },
                                );
                                modal.open();
                            });
                            break;
                        }
                        case "no-output-wrapper": {
                            // Disable output wrapper.
                            output_wrappers[output_stream_name] = null;
                            await this.plugin.saveSettings();
                            break;
                        }
                        default: {
                            // Use an existing output wrapper.
                            output_wrappers[output_stream_name] = output_wrapper_id;
                            await this.plugin.saveSettings();
                            break;
                        }
                    }
                })
            )
        ;
    }

    protected approve(): void {
        // No need to perform any action, just close the modal.
        this.close();
    }
}