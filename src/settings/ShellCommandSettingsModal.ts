/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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
import {
    IconName,
    sanitizeHTMLToDom,
    setIcon,
    Setting,
    TextAreaComponent,
} from "obsidian";
import SC_Plugin from "../main";
import {
    SC_MainSettingsTab,
    SettingFieldGroup,
} from "./SC_MainSettingsTab";
import {getOutputChannelsOptionList} from "../output_channels/OutputChannelFunctions";
import {
    OutputHandlerCode,
    OutputChannelOrder,
    OutputHandlingMode,
    OutputStream,
} from "../output_channels/OutputHandlerCode";
import {TShellCommand} from "../TShellCommand";
import {
    CommandPaletteOptions,
    ExecutionNotificationMode,
    ICommandPaletteOptions,
    PlatformId,
    PlatformNames,
} from "./SC_MainSettings";
import {createShellSelectionFields} from "./setting_elements/CreateShellSelectionFields";
import {
    createExecuteNowButton,
    generateIgnoredErrorCodesIconTitle,
    generateShellCommandFieldIconAndName,
} from "./setting_elements/CreateShellCommandField";
import {createPlatformSpecificShellCommandField} from "./setting_elements/CreatePlatformSpecificShellCommandField";
import {createTabs, TabStructure} from "./setting_elements/Tabs";
import {createAutocomplete} from "./setting_elements/Autocomplete";
import {getSC_Events} from "../events/SC_EventList";
import {SC_Event} from "../events/SC_Event";
import {
    copyToClipboard,
    gotoURL,
    inputToFloat,
} from "../Common";
import {SC_Modal} from "../SC_Modal";
import {
    getDefaultPreaction_Prompt_Configuration,
    getModel,
    Preaction_Prompt_Configuration,
    Prompt,
    PromptModel,
    PromptSettingsModal,
} from "../imports";
import {CmdOrCtrl} from "../Hotkeys";
import {
    getIconHTML,
    SORTED_ICON_LIST,
} from "../Icons";
import {OutputWrapper} from "../models/output_wrapper/OutputWrapper";
import {OutputWrapperModel} from "../models/output_wrapper/OutputWrapperModel";
import {OutputWrapperSettingsModal} from "../models/output_wrapper/OutputWrapperSettingsModal";
import {Documentation} from "../Documentation";
import {decorateMultilineField} from "./setting_elements/multilineField";
import {createVariableDefaultValueFields} from "./setting_elements/createVariableDefaultValueFields";
import {CreateShellCommandFieldCore} from "./setting_elements/CreateShellCommandFieldCore";
import {createExecutionNotificationField} from "./setting_elements/createExecutionNotificationField";
import {ShellCommandConfiguration} from "./ShellCommandConfiguration";
import {Debouncer} from "../Debouncer";

export class ShellCommandSettingsModal extends SC_Modal {
    public static GENERAL_OPTIONS_SUMMARY = "Alias, Icon, Confirmation, Stdin";
    public static PREACTIONS_OPTIONS_SUMMARY = "Preactions: Prompt for asking values from user";
    public static OUTPUT_OPTIONS_SUMMARY = "Stdout/stderr handling, Ignore errors";
    public static ENVIRONMENTS_OPTIONS_SUMMARY = "Shell selection, Operating system specific shell commands";
    public static EVENTS_SUMMARY = "Events";
    public static VARIABLES_SUMMARY = "Default values for variables";

    private readonly shell_command_id: string;
    private readonly t_shell_command: TShellCommand;
    private settingGroupInMainTab: SettingFieldGroup;
    private name_setting: Setting; // TODO: Remove name_setting and use settingGroupInMainTab.name_setting instead.
    private setting_tab: SC_MainSettingsTab;
    private tab_structure: TabStructure;

    constructor(plugin: SC_Plugin, shell_command_id: string, setting_tab: SC_MainSettingsTab) {
        super(plugin);
        this.shell_command_id = shell_command_id;
        this.t_shell_command = plugin.getTShellCommands()[shell_command_id];
        this.name_setting = setting_tab.setting_groups[shell_command_id].name_setting;
        this.settingGroupInMainTab = setting_tab.setting_groups[shell_command_id];
        this.setting_tab = setting_tab;
    }

    public onOpen() {
        super.onOpen();

        // Modal title.
        this.setTitle(this.t_shell_command.getAliasOrShellCommand());

        // Tabs
        this.tab_structure = createTabs(
            this.modalEl,
            {
                "extra-options-general": {
                    title: "General",
                    icon: "gear",
                    content_generator: (container_element: HTMLElement) => this.tabGeneral(container_element),
                },
                "extra-options-preactions": {
                    title: "Preactions",
                    icon: "note-glyph",
                    content_generator: (container_element: HTMLElement) => this.tabPreactions(container_element),
                },
                "extra-options-output": {
                    title: "Output",
                    icon: "lines-of-text",
                    content_generator: (container_element: HTMLElement) => this.tabOutput(container_element),
                },
                "extra-options-environments": {
                    title: "Environments",
                    icon: "stacked-levels",
                    content_generator: (container_element: HTMLElement) => this.tabEnvironments(container_element),
                },
                "extra-options-events": {
                    title: "Events",
                    icon: "dice",
                    content_generator: (container_element: HTMLElement) => this.tabEvents(container_element),
                },
                "extra-options-variables": {
                    title: "Variables",
                    icon: "code-glyph",
                    content_generator: (container_element: HTMLElement) => this.tabVariables(container_element),
                },
            },
            "extra-options-general",
        );

        // Hotkeys for moving to next/previous shell command
        const switch_to_t_shell_command = (t_shell_command: TShellCommand) => {
            const new_modal = new ShellCommandSettingsModal(this.plugin, t_shell_command.getId(), this.setting_tab);
            this.close(); // Needs to be closed before the new one is opened, otherwise the new one's tab content won't be shown.
            new_modal.open();
            new_modal.activateTab(this.tab_structure.active_tab_id);
        };
        this.scope.register(["Mod"], "ArrowUp", () => {
            const previousTShellCommand = this.t_shell_command.previousTShellCommand();
            if (previousTShellCommand) {
                switch_to_t_shell_command(previousTShellCommand);
            }
        });
        this.scope.register(["Mod"], "ArrowDown", () => {
            const nextTShellCommand = this.t_shell_command.nextTShellCommand();
            if (nextTShellCommand) {
                switch_to_t_shell_command(nextTShellCommand);
            }
        });
        const bottomSetting = new Setting(this.modalEl)
            .setDesc("Tip! Hit " + CmdOrCtrl() + " + up/down to switch to previous/next shell command.")
        ;
        createExecuteNowButton(this.plugin, bottomSetting, this.t_shell_command);
    }

    private async tabGeneral(container_element: HTMLElement): Promise<void> {
        // Alias field
        const alias_container = container_element.createDiv({attr: {class: "SC-setting-group"}});
        new Setting(alias_container)
            .setName("Alias")
        ;
        const on_alias_change = async (value: string) => {
            // Change the actual alias value
            this.t_shell_command.getConfiguration().alias = value;

            // Update Obsidian command palette
            this.t_shell_command.renameObsidianCommand(this.t_shell_command.getAliasOrShellCommand());

            // UpdateShell commands settings panel
            this.name_setting.nameEl.innerHTML = generateShellCommandFieldIconAndName(this.t_shell_command);
            
            // Update this modal's title.
            this.setTitle(this.t_shell_command.getAliasOrShellCommand());

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
                    for (const icon of SORTED_ICON_LIST) {
                        // Create an option for the icon.
                        dropdown.addOption(icon.iconId, icon.displayName);
                    }
                    dropdown.setValue(current_icon ?? "no-icon"); // "" == the 'No icon' option.
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
        icon_setting.nameEl.innerHTML = "Icon " + (current_icon ? getIconHTML(current_icon) : "");

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

        // Stdin field
        new Setting(container_element)
            .setName("Pass variables to standard input (stdin) (experimental)")
            .setDesc("Used to pass long texts as input to the shell command. There is a limit to command line length, and e.g. {{note_content}} might provide a value too long to be used as an argument, so it works better when passed to stdin. Also, programs that ask multiple values interactively, can be fed with values using stdin. If there are multiple values that need to be inputted, put them on separate lines. Many shell programs interpret newlines as separators between different values.")
            .addExtraButton(extraButtonComponent => extraButtonComponent
                .setIcon("help")
                .setTooltip("Documentation: Pass variables to stdin")
                .onClick(() => gotoURL(Documentation.variables.passVariablesToStdin))
            )
        ;
        const stdinSettingContainer = container_element.createDiv({attr: {class: "SC-setting-group"}});
        const onStdinChange = async (newStdinContent: string) => {
            if ("" === newStdinContent) {
                // Set to null
                this.t_shell_command.getConfiguration().input_contents.stdin = null;
            } else {
                // Set value
                this.t_shell_command.getConfiguration().input_contents.stdin = newStdinContent;
            }
            await this.plugin.saveSettings();
        };
        new Setting(stdinSettingContainer)
            .setDesc("Can contain {{variables}} and/or static text.")
            .addTextArea(textareaComponent => {
                textareaComponent
                    .setValue(this.t_shell_command.getInputChannels().stdin ?? "")
                ;
                decorateMultilineField(this.plugin, textareaComponent, onStdinChange);
                if (this.plugin.settings.show_autocomplete_menu) {
                    // Show autocomplete menu (= a list of available variables).
                    createAutocomplete(this.plugin, textareaComponent.inputEl, onStdinChange);
                }
            })
        ;

        // Shell command id
        new Setting(container_element)
            .setDesc(`Shell command id: ${this.shell_command_id}`)
            .addExtraButton(button => button
                .setIcon("documents")
                .setTooltip(`Copy ${this.shell_command_id} to the clipboard.`)
                .onClick(() => {
                    copyToClipboard(this.shell_command_id);
                    this.plugin.newNotification(`${this.shell_command_id} was copied to the clipboard.`);
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
                        this.plugin.newNotification(`${obsidian_command_id} was copied to the clipboard.`);
                    }),
                )
                .settingEl.addClass("SC-no-top-border") // No horizontal ruler between the two id elements.
            ;
        }
    }

    private async tabPreactions(container_element: HTMLElement): Promise<void> {
        container_element.createEl("p", {text: "Preactions are performed before the actual shell command gets executed, to do certain preparations for the shell command."});
        const preactions_configuration = this.t_shell_command.getConfiguration().preactions;

        // Load config values
        let preaction_prompt_configuration: Preaction_Prompt_Configuration | null = null;
        for (const preaction_configuration of preactions_configuration) {
            switch (preaction_configuration.type) {
                case "prompt":
                    preaction_prompt_configuration = preaction_configuration as Preaction_Prompt_Configuration;
                    break;
                default:
                    throw new Error("Unrecognised preaction type: " + preaction_configuration.type);
            }
        }

        // Preaction: Prompt
        const prompt_options: {[key: string]: string} = {};
        this.plugin.getPrompts().forEach((prompt: Prompt) => {
            prompt_options[prompt.getID()] = prompt.getTitle();
        });
        let old_selected_prompt_option: string = (preaction_prompt_configuration?.enabled) ? preaction_prompt_configuration.prompt_id as string : "no-prompt";
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
                            const model = getModel<PromptModel>(PromptModel.name);
                            const new_prompt = model.newInstance(this.plugin.settings);
                            this.plugin.saveSettings().then(() => {
                                const modal = new PromptSettingsModal(
                                    this.plugin,
                                    new_prompt,
                                    undefined,
                                    "Create prompt",
                                    async () => {
                                        // Prompt is created.
                                        dropdown.addOption(new_prompt.getID(), new_prompt.getTitle());
                                        dropdown.setValue(new_prompt.getID());
                                        (preaction_prompt_configuration as Preaction_Prompt_Configuration).enabled = true; // 'as Preaction_Prompt_Configuration' tells TypeScript that the variable is not null.
                                        (preaction_prompt_configuration as Preaction_Prompt_Configuration).prompt_id = new_prompt.getID();
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

    private async tabOutput(container_element: HTMLElement): Promise<void> {
        // Output channeling
        const stdout_channel_setting = this.newOutputChannelSetting(container_element, "Output channel for stdout", "stdout");
        this.newOutputChannelSetting(container_element, "Output channel for stderr", "stderr", "If both stdout and stderr use the same channel, stderr will be combined to same message with stdout.");

        // Output wrappers
        this.newOutputWrapperSetting(container_element, "Output wrapper for stdout", "stdout", "Output wrappers can be used to surround output with predefined text, e.g. to put output into a code block. Note: If 'Output mode' is 'Realtime', wrappers will probably appear multiple times in output!");
        this.newOutputWrapperSetting(container_element, "Output wrapper for stderr", "stderr");
        
        // ANSI code conversion.
        this.newAnsiCodeConversionSetting(container_element, sanitizeHTMLToDom("Shell programs may output <a href=\"https://en.wikipedia.org/wiki/ANSI_escape_code\">ANSI code</a> to apply <span style=\"color: magenta\">colors</span>, <strong>font</strong> <em>styles</em> and other formatting (e.g. links) to the outputted text. If turned on, possible ANSI code occurrences are converted to HTML elements using <a href=\"https://github.com/drudru/ansi_up\">ansi_up.js</a> library (bundled in this plugin). Otherwise, possible ANSI code is displayed as-is, which may look ugly."));

        // Output handling mode
        new Setting(container_element)
            .setName("Output handling mode")
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

            // Documentation link
            .addExtraButton(icon => icon
                .setIcon("help")
                .onClick(() => gotoURL(Documentation.outputHandling.outputHandlingMode))
                .setTooltip("Documentation: Output handling mode"),
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
        
        // "Show a notification when executing shell commands" field
        createExecutionNotificationField(
            container_element,
            this.t_shell_command.getConfiguration().execution_notification_mode,
            this.plugin.settings.execution_notification_mode,
            this.plugin.settings.notification_message_duration,
            async (newExecutionNotificationMode: ExecutionNotificationMode | null) => {
                // Save the change.
                this.t_shell_command.getConfiguration().execution_notification_mode = newExecutionNotificationMode;
                await this.plugin.saveSettings();
            }
        );
    }

    private async tabEnvironments(container_element: HTMLElement): Promise<void> {
        
        // Default shell command for platforms that don't have a specific command.
        const defaultSettingGroup: SettingFieldGroup = this.newDefaultShellCommandContentSetting(container_element, () => {
            // When the default shell command content changes, update placeholders of platform specific shell command fields.
            for (const settingGroup of platformSpecificSettingGroups.values()) {
                const textareaComponent: TextAreaComponent | undefined = settingGroup.shell_command_setting.components.first() as TextAreaComponent | undefined;
                if (textareaComponent) {
                    textareaComponent.setPlaceholder(this.t_shell_command.getDefaultShellCommand());
                    textareaComponent.onChanged(); // Update textarea dimensions.
                }
            }
            
            // Update the shell command content on the main settings modal.
            const mainModalShellCommandTextareaComponent: TextAreaComponent | undefined = this.setting_tab.setting_groups[this.shell_command_id].shell_command_setting.components.first() as TextAreaComponent | undefined;
            if (mainModalShellCommandTextareaComponent) {
                mainModalShellCommandTextareaComponent.setValue(this.t_shell_command.getDefaultShellCommand());
                mainModalShellCommandTextareaComponent.onChanged(); // Update textarea dimensions.
            }
        });
        
        // Platform specific shell commands
        let platform_id: PlatformId;
        const platformSpecificSettingGroups: Map<PlatformId, SettingFieldGroup> = new Map;
        for (platform_id in PlatformNames) {
            platformSpecificSettingGroups.set(
                platform_id,
                createPlatformSpecificShellCommandField(
                    this.plugin,
                    container_element,
                    this.t_shell_command,
                    platform_id,
                    this.plugin.settings.show_autocomplete_menu,
                    () => {
                        // When whichever platform specific shell command content changes, update default shell command's preview, because its shell might change.
                        const defaultShell = this.t_shell_command.getShellForDefaultCommand();
                        defaultSettingGroup.refreshPreview(defaultShell);
                    },
                ),
            );
        }

        // Platform specific shell selection
        createShellSelectionFields(this.plugin, container_element, this.t_shell_command.getShells(), false, (platformId: PlatformId) => {
            // When a shell is changed, update previews of default and platform specific shell command fields.
            const shellForDefaultCommand = this.t_shell_command.getShellForDefaultCommand();
            defaultSettingGroup.refreshPreview(shellForDefaultCommand);
            this.settingGroupInMainTab.refreshPreview(shellForDefaultCommand);
            platformSpecificSettingGroups.get(platformId)?.refreshPreview(this.t_shell_command.getShellForPlatform(platformId));
        });
    }

    private async tabEvents(container_element: HTMLElement): Promise<void> {
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
        
        // Debouncing
        // TODO: Extract to a separate method. Actually, consider creating subclasses for each tab, e.g. ShellCommandSettingsModal_TabEvents. Then it's more meaningful to create new tab specific methods.
        const shellCommandConfiguration: ShellCommandConfiguration = this.t_shell_command.getConfiguration();
        const noDebounceIcon: IconName = "shield-ban";
        const debouncingSettingsContainer = container_element.createDiv({cls: "SC-setting-group"});
        new Setting(debouncingSettingsContainer)
            .setName("Debouncing (experimental)")
            .setHeading()
            .setDesc("If enabled, events cannot perform multiple concurrent (or too adjacent) executions of this shell command. Debouncing does not affect events marked with ")
            .addExtraButton(helpButton => helpButton
                .setIcon("help")
                .setTooltip("Documentation: Events - Debouncing")
                .onClick(() => gotoURL(Documentation.events.debouncing))
            )
            .then((setting) => {
                // Append no debouncing icon and a dot to description.
                setIcon(setting.descEl.createSpan(), noDebounceIcon);
                setting.descEl.innerHTML += ".";
            })
        ;
        new Setting(debouncingSettingsContainer)
            .setName("Execute before cooldown")
            .addToggle(executeEarlyToggle => executeEarlyToggle
                .setValue(shellCommandConfiguration.debounce?.executeEarly ?? false)
                .onChange((executeEarly: boolean) => {
                    if (null === shellCommandConfiguration.debounce) {
                        shellCommandConfiguration.debounce = Debouncer.getDefaultConfiguration(executeEarly, false);
                    } else {
                        shellCommandConfiguration.debounce.executeEarly = executeEarly;
                    }
                    possiblyCleanupDebounceConfiguration();
                    defineDebounceAdditionalSettings();
                    this.plugin.saveSettings();
                })
            )
        ;
        new Setting(debouncingSettingsContainer)
            .setName("Execute after cooldown")
            .addToggle(executeLateToggle => executeLateToggle
                .setValue(shellCommandConfiguration.debounce?.executeLate ?? false)
                .onChange((executeLate: boolean) => {
                    if (null === shellCommandConfiguration.debounce) {
                        shellCommandConfiguration.debounce = Debouncer.getDefaultConfiguration(false, executeLate);
                    } else {
                        shellCommandConfiguration.debounce.executeLate = executeLate;
                    }
                    possiblyCleanupDebounceConfiguration();
                    defineDebounceAdditionalSettings();
                    this.plugin.saveSettings();
                })
            )
        ;
        const debounceAdditionalSettingsContainer = debouncingSettingsContainer.createDiv();
        const defineDebounceAdditionalSettings = () => {
            debounceAdditionalSettingsContainer.innerHTML = ""; // Remove possible earlier settings.
            if (this.t_shell_command.isDebouncingEnabled()) {
                // Debouncing is enabled.
                
                // Description for debouncing.
                let debouncingDescription: string;
                switch ((shellCommandConfiguration.debounce?.executeEarly ? "early" : "") + "-" + (shellCommandConfiguration.debounce?.executeLate ? "late" : "")) {
                    case "early-late":
                        // Both early and late execution.
                        debouncingDescription = "When executing both <em>Before and After cooldown</em>, the shell command is executed right-away, and <strong>subsequent executions are postponed</strong> for as long as the execution is in progress, <strong>plus</strong> the <em>Cooldown duration</em> after the execution. After the cooldown period ends, the shell command is possibly re-executed, if any subsequent executions were postponed.";
                        break;
                    case "early-":
                        // Early execution.
                        debouncingDescription = "When executing <em>Before cooldown</em>, the shell command is executed right-away, and <strong>subsequent executions are prevented</strong> for as long as the execution is in progress, <strong>plus</strong> the <em>Cooldown duration</em> after the execution.";
                        break;
                    case "-late":
                        // Late execution.
                        debouncingDescription = "When executing <em>After cooldown</em>, the shell command execution will be delayed by the <em>Cooldown duration</em>. <strong>Subsequent executions are prevented</strong> during the cooldown phase, or <strong>postponed</strong> during the execution phase.";
                        break;
                    default:
                        throw new Error("Unidentified debouncing state: " + JSON.stringify(shellCommandConfiguration.debounce));
                }
                const debouncingDescriptionFragment = new DocumentFragment();
                debouncingDescriptionFragment.createDiv().innerHTML = debouncingDescription;
                new Setting(debounceAdditionalSettingsContainer)
                    .setClass("SC-full-description")
                    .setDesc(debouncingDescriptionFragment)
                ;
                
                // Cooldown duration setting.
                new Setting(debounceAdditionalSettingsContainer)
                    .setName("Cooldown duration (seconds)")
                    .setDesc("If you only need to prevent simultaneous execution, but do not need extra cooldown time, you can set this to 0.")
                    .addText(thresholdTextComponent => thresholdTextComponent
                        .setValue((shellCommandConfiguration.debounce?.cooldownDuration ?? 0).toString())
                        .onChange((newThresholdString: string) => {
                            const newThreshold: number = inputToFloat(newThresholdString, 1);
                            if (!shellCommandConfiguration.debounce) {
                                throw new Error("shellCommandConfiguration.debounce is falsy.");
                            }
                            if (newThreshold >= 0) {
                                shellCommandConfiguration.debounce.cooldownDuration = newThreshold;
                            } else {
                                shellCommandConfiguration.debounce.cooldownDuration = 0;
                            }
                            this.plugin.saveSettings();
                        })
                    )
                ;
                const prolongCooldownDescriptionFragment = new DocumentFragment();
                prolongCooldownDescriptionFragment.createDiv().innerHTML = "If enabled, events occurring during a <strong>cooldown</strong> phase will reset the cooldown timer, making the cooldown last longer. Thus, executions are avoided for an extended period.";
                new Setting(debounceAdditionalSettingsContainer)
                    .setName("Prolong cooldown")
                    .setDesc(prolongCooldownDescriptionFragment)
                    .setClass("SC-full-description")
                    .addToggle(prolongCooldownToggle => prolongCooldownToggle
                        .setValue(shellCommandConfiguration.debounce?.prolongCooldown ?? false)
                        .onChange((newProlongCooldown: boolean) => {
                            if (!shellCommandConfiguration.debounce) {
                                throw new Error("shellCommandConfiguration.debounce is falsy.");
                            }
                            shellCommandConfiguration.debounce.prolongCooldown = newProlongCooldown;
                            this.plugin.saveSettings();
                        })
                    )
                ;
            } else {
                // Debouncing is disabled.
                new Setting(debounceAdditionalSettingsContainer)
                    .setDesc("Debouncing is disabled, so executions can happen simultaneously and without delays.")
                ;
            }
        };
        const possiblyCleanupDebounceConfiguration = () => {
            if (shellCommandConfiguration.debounce) {
                if (!shellCommandConfiguration.debounce.executeEarly && !shellCommandConfiguration.debounce.executeLate) {
                    // Debouncing is disabled, but the configuration object exists.
                    if (shellCommandConfiguration.debounce.cooldownDuration === 0) {
                        // The DebounceConfiguration object can be removed. No need to remember the cooldown, because user probably did not type 0 themselves.
                        shellCommandConfiguration.debounce = null;
                        this.t_shell_command.resetDebouncer(); // If debouncing is re-enabled later, ensure there's no old debouncer trying to use an old, stale configuration.
                    }
                }
            }
        };
        defineDebounceAdditionalSettings();

        // Focus on the command palette availability field
        command_palette_availability_setting.controlEl.find("select").addClass("SC-focus-element-on-tab-opening");

        // Events
        new Setting(container_element)
            .setName("Execute this shell command automatically when:")
            .setHeading() // Make the name bold
        ;
        getSC_Events(this.plugin).forEach((sc_event: SC_Event) => {
            const is_event_enabled: boolean = this.t_shell_command.isSC_EventEnabled(sc_event.static().getCode());
            const setting = new Setting(container_element)
                .setName(sc_event.static().getTitle())
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

            // Mention additional variables (if any)
            if (sc_event.createSummaryOfEventVariables(setting.descEl)) {
                setting.descEl.insertAdjacentText("afterbegin", "Additional variables: ");
            }
            // Create a no debouncing icon, if applicable.
            if (!sc_event.static().canDebounce()) {
                setting.nameEl.insertAdjacentText("beforeend", " ");
                const iconSpan: HTMLElement = setting.nameEl.createSpan();
                setIcon(iconSpan, noDebounceIcon);
                iconSpan.setAttr("aria-label", "This event cannot be limited by debouncing.");
            }

            // Extra settings
            const extra_settings_container = container_element.createDiv();
            extra_settings_container.style.display = is_event_enabled ? "block" : "none";
            sc_event.createExtraSettingsFields(extra_settings_container, this.t_shell_command);
        });
    }

    private async tabVariables(containerElement: HTMLElement): Promise<void> {

        // Default values for variables
        new Setting(containerElement)
            .setName("Default values for variables")
            .setDesc("Certain variables can be inaccessible during certain situations, e.g. {{file_name}} is not available when no file pane is focused. You can define default values that will be used when a variable is otherwise unavailable.")
            .setHeading()
        ;

        createVariableDefaultValueFields(
            this.plugin,
            containerElement,
            this.t_shell_command,
        );
    }

    public activateTab(tab_id: string) {
        if (undefined === this.tab_structure.buttons[tab_id]) {
            throw Error("Invalid tab id: " + tab_id);
        }
        this.tab_structure.buttons[tab_id].click();
    }

    private newOutputChannelSetting(container_element: HTMLElement, title: string, output_stream_name: OutputStream, description = "") {
        const output_channel_options = getOutputChannelsOptionList(output_stream_name);
        return new Setting(container_element)
            .setName(title)
            .setDesc(description)
            .addDropdown(dropdown => dropdown
                .addOptions(output_channel_options)
                .setValue(this.t_shell_command.getOutputHandlers()[output_stream_name].handler)
                .onChange(async (value: OutputHandlerCode) => {
                    this.t_shell_command.getConfiguration().output_handlers[output_stream_name].handler = value;
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
        let old_selected_output_wrapper_option: string = output_wrappers[output_stream_name] ?? "no-output-wrapper";
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
                                    undefined,
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
    
    private newAnsiCodeConversionSetting(containerElement: HTMLElement, description: string | DocumentFragment) {
        const ansiCodeSetting = new Setting(containerElement)
            .setName("Detect colors, font styles etc. in output (ANSI code)")
            .setDesc(description)
        ;
    
        const addAnsiCodeFieldForOutputStream = (outputStreamName: OutputStream) => {
            ansiCodeSetting.addDropdown(dropdownComponent => dropdownComponent
                .addOptions({
                    enable: outputStreamName + ": Enable",
                    disable: outputStreamName + ": Disable",
                })
                .setValue(this.t_shell_command.getConfiguration().output_handlers[outputStreamName].convert_ansi_code ? "enable" : "disable")
                .onChange(async (enableString: string) => {
                    this.t_shell_command.getConfiguration().output_handlers[outputStreamName].convert_ansi_code = (enableString === "enable");
                    await this.plugin.saveSettings();
                }),
            );
        };
        addAnsiCodeFieldForOutputStream("stdout");
        addAnsiCodeFieldForOutputStream("stderr");
        ansiCodeSetting.addExtraButton(helpButton => helpButton
            .setIcon("help")
            .setTooltip("Documentation: Output text styling with ANSI code")
            .onClick(() => gotoURL(Documentation.outputHandling.ansiCode))
        );
    }
    
    private newDefaultShellCommandContentSetting(containerElement: HTMLElement, onChange: () => void): SettingFieldGroup {
        const settingGroup = CreateShellCommandFieldCore(
            this.plugin,
            containerElement,
            "Default shell command",
            this.t_shell_command.getPlatformSpecificShellCommands().default,
            this.t_shell_command.getShellForDefaultCommand() ?? this.plugin.getDefaultShell(), // If default shell command content is never used, just get some shell.
            this.t_shell_command,
            this.plugin.settings.show_autocomplete_menu,
            async (shellCommandContent: string) => {
                // Store the updated shell command content.
                this.t_shell_command.getPlatformSpecificShellCommands().default = shellCommandContent; // Can be an empty string.
                await this.plugin.saveSettings();
                onChange();
            },
        );
        settingGroup.name_setting.setDesc("Used on operating systems that do not define their own shell command.");
        
        // Focus on the textarea.
        settingGroup.shell_command_setting.controlEl.find("textarea").addClass("SC-focus-element-on-tab-opening");
        
        return settingGroup;
    }

    protected approve(): void {
        // No need to perform any action, just close the modal.
        this.close();
    }
}