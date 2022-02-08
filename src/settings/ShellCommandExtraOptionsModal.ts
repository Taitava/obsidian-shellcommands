import {App, Modal, setIcon, Setting} from "obsidian";
import ShellCommandsPlugin from "../main";
import {ShellCommandSettingGroup, ShellCommandsSettingsTab} from "./ShellCommandsSettingsTab";
import {getOutputChannelDriversOptionList} from "../output_channels/OutputChannelDriverFunctions";
import {OutputChannel, OutputChannelOrder, OutputStream} from "../output_channels/OutputChannel";
import {TShellCommand} from "../TShellCommand";
import {CommandPaletteOptions, ICommandPaletteOptions, PlatformId, PlatformNames} from "./ShellCommandsPluginSettings";
import {createShellSelectionField} from "./setting_elements/CreateShellSelectionField";
import {
    generateIgnoredErrorCodesIconTitle,
    generateShellCommandFieldName
} from "./setting_elements/CreateShellCommandField";
import {createPlatformSpecificShellCommandField} from "./setting_elements/CreatePlatformSpecificShellCommandField";
import {createTabs, TabStructure} from "./setting_elements/Tabs";
import {getSC_Events} from "../events/SC_EventList";
import {SC_Event} from "../events/SC_Event";
import {gotoURL} from "../Common";

export class ShellCommandExtraOptionsModal extends Modal {
    static GENERAL_OPTIONS_SUMMARY = "Alias, Confirmation";
    static OUTPUT_OPTIONS_SUMMARY = "Stdout/stderr handling, Ignore errors";
    static OPERATING_SYSTEMS_AND_SHELLS_OPTIONS_SUMMARY = "Shell selection, Operating system specific shell commands";
    static EVENTS_SUMMARY = "Events";

    private plugin: ShellCommandsPlugin;
    private readonly shell_command_id: string;
    private readonly t_shell_command: TShellCommand;
    private name_setting: Setting;
    private setting_tab: ShellCommandsSettingsTab;
    private tab_structure: TabStructure;

    constructor(app: App, plugin: ShellCommandsPlugin, shell_command_id: string, setting_group: ShellCommandSettingGroup, setting_tab: ShellCommandsSettingsTab) {
        super(app);
        this.plugin = plugin;
        this.shell_command_id = shell_command_id;
        this.t_shell_command = plugin.getTShellCommands()[shell_command_id];
        this.name_setting = setting_group.name_setting;
        this.setting_tab = setting_tab;
    }

    onOpen() {
        this.modalEl.createEl("h2", {text: this.t_shell_command.getDefaultShellCommand()});

        // Make the modal scrollable if it has more content than what fits in the screen.
        this.modalEl.addClass("SC-scrollable");

        // Tabs
        this.tab_structure = createTabs(this.modalEl, {
            "extra-options-general": {
                title: "General",
                icon: "gear",
                content_generator: (container_element: HTMLElement) => {
                    this.tabGeneral(container_element);
                },
            },
            "extra-options-output": {
                title: "Output",
                icon: "lines-of-text",
                content_generator: (container_element: HTMLElement) => {
                    this.tabOutput(container_element);
                },
            },
            "extra-options-operating-systems-and-shells": {
                title: "Operating systems & shells",
                icon: "stacked-levels",
                content_generator: (container_element: HTMLElement) => {
                    this.tabOperatingSystemsAndShells(container_element);
                },
            },
            "extra-options-events": {
                title: "Events",
                icon: "dice",
                content_generator: (container_element: HTMLElement) => {
                    this.tabEvents(container_element);
                },
            },
        });
    }

    private tabGeneral(container_element: HTMLElement) {
        // Alias field
        new Setting(container_element)
            .setName("Alias")
            .setClass("shell-commands-name-setting")
        ;
        const alias_setting = new Setting(container_element)
            .addText(text => text
                .setValue(this.t_shell_command.getAlias())
                .onChange(async (value) => {
                    // Change the actual alias value
                    this.t_shell_command.getConfiguration().alias = value;

                    // Update Obsidian command palette
                    this.t_shell_command.renameObsidianCommand(this.t_shell_command.getShellCommand(), this.t_shell_command.getAlias());

                    // UpdateShell commands settings panel
                    this.name_setting.setName(generateShellCommandFieldName(this.shell_command_id, this.t_shell_command));

                    // Save
                    await this.plugin.saveSettings();
                })
            )
            .setClass("shell-commands-shell-command-setting")
        ;
        alias_setting.controlEl.find("input").addClass("SC-focus-element-on-tab-opening"); // Focus without a need to click the field.
        container_element.createEl("p", {text: "If not empty, the alias will be displayed in the command palette instead of the actual command. An alias is never executed as a command."});
        container_element.createEl("p", {text: "You can also use the same {{}} style variables in aliases that are used in shell commands. When variables are used in aliases, they do not affect the command execution in any way, but it's a nice way to reveal what values your command will use, even when an alias hides most of the other technical details. Starting a variable with {{! will prevent escaping special characters in command palette."});

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

    private tabOutput(container_element: HTMLElement) {
        // Output channeling
        const stdout_channel_setting = this.newOutputChannelSetting(container_element, "Output channel for stdout", "stdout");
        this.newOutputChannelSetting(container_element, "Output channel for stderr", "stderr", "If both stdout and stderr use the same channel, stderr will be combined to same message with stdout.");
        new Setting(container_element)
            .setName("Order of stdout/stderr output")
            .setDesc("When output contains both errors and normal output, which one should be presented first?")
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
            .setDesc("A comma separated list of numbers. If executing a shell command fails with one of these exit codes, no error message will be displayed, and the above stderr channel will be ignored. Stdout channel will still be used for stdout. Error codes must be integers and greater than or equal to 0. Anything else will be removed.")
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
                        icon_container.removeClass("shell-commands-hide");
                    } else {
                        // Hide icon
                        icon_container.addClass("shell-commands-hide");
                    }
                })
            )
        ;
    }

    private tabOperatingSystemsAndShells(container_element: HTMLElement) {
        // Platform specific shell commands
        let platform_id: PlatformId;
        let is_first = true;
        for (platform_id in PlatformNames) {
            const setting_group = createPlatformSpecificShellCommandField(this.plugin, container_element, this.t_shell_command, platform_id, this.plugin.settings.show_autocomplete_menu);
            if (is_first) {
                // Focus on the first OS specific shell command field
                setting_group.shell_command_setting.controlEl.find("input").addClass("SC-focus-element-on-tab-opening");
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
            .setName("Execute this shell command automatically on:")
            .setHeading() // Make the name bold
        ;
        getSC_Events(this.plugin).forEach((sc_event: SC_Event) => {
            const is_event_enabled: boolean = this.t_shell_command.isSC_EventEnabled(sc_event.static().getCode());
            const summary_of_extra_variables = sc_event.getSummaryOfEventVariables(this.t_shell_command.getShell());
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

    public activateTab(tab_id: string) {
        if (undefined === this.tab_structure.buttons[tab_id]) {
            throw Error("Invalid tab id: " + tab_id);
        }
        this.tab_structure.buttons[tab_id].click();
    }

    private newOutputChannelSetting(container_element: HTMLElement, title: string, output_stream_name: OutputStream, description: string = "") {
        const output_channel_options = getOutputChannelDriversOptionList(output_stream_name);
        return new Setting(container_element)
            .setName(title)
            .setDesc(description)
            .addDropdown(dropdown => dropdown
                .addOptions(output_channel_options)
                .setValue(this.t_shell_command.getOutputChannels()[output_stream_name])
                .onChange(async (value: OutputChannel) => {
                    this.t_shell_command.getConfiguration().output_channels[output_stream_name] = value;
                    await this.plugin.saveSettings();
                })
            )
        ;
    }
}