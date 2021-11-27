import {App, Modal, setIcon, Setting} from "obsidian";
import ShellCommandsPlugin from "../main";
import {ShellCommandSettingGroup, ShellCommandsSettingsTab} from "./ShellCommandsSettingsTab";
import {getOutputChannelDriversOptionList} from "../output_channels/OutputChannelDriverFunctions";
import {OutputChannel, OutputChannelOrder, OutputStream} from "../output_channels/OutputChannel";
import {TShellCommand} from "../TShellCommand";
import {PlatformId, PlatformNames} from "./ShellCommandsPluginSettings";
import {createShellSelectionField} from "./setting_elements/CreateShellSelectionField";
import {
    generateIgnoredErrorCodesIconTitle,
    generateShellCommandFieldName
} from "./setting_elements/CreateShellCommandField";
import {createPlatformSpecificShellCommandField} from "./setting_elements/CreatePlatformSpecificShellCommandField";
import {createTabs, TabStructure} from "./setting_elements/Tabs";

export class ShellCommandExtraOptionsModal extends Modal {
    static GENERAL_OPTIONS_SUMMARY = "Alias, Confirmation";
    static OUTPUT_OPTIONS_SUMMARY = "Stdout/stderr handling, Ignore errors";
    static OPERATING_SYSTEMS_AND_SHELLS_OPTIONS_SUMMARY = "Shell selection, Operating system specific shell commands";

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
        });
    }

    private tabGeneral(container_element: HTMLElement) {
        // Alias field
        new Setting(container_element)
            .setName("Alias")
            .setClass("shell-commands-name-setting")
        ;
        let alias_setting = new Setting(container_element)
            .addText(text => text
                .setValue(this.t_shell_command.getAlias())
                .onChange(async (value) => {
                    // Change the actual alias value
                    this.t_shell_command.getConfiguration().alias = value;

                    // Update Obsidian command palette
                    this.plugin.obsidian_commands[this.shell_command_id].name = this.plugin.generateObsidianCommandName(this.t_shell_command);

                    // UpdateShell commands settings panel
                    this.name_setting.setName(generateShellCommandFieldName(this.shell_command_id, this.t_shell_command));

                    // Save
                    await this.plugin.saveSettings();
                })
            )
            .setClass("shell-commands-shell-command-setting")
        ;
        alias_setting.controlEl.find("input").focus(); // Focus without a need to click the field.
        container_element.createEl("p", {text: "If not empty, the alias will be displayed in the command palette instead of the actual command. An alias is never executed as a command."});
        container_element.createEl("p", {text: "You can also use the same {{}} style variables in aliases that are used in shell commands. When variables are used in aliases, they do not affect the command execution in any way, but it's a nice way to reveal what values your command will use, even when an alias hides most of the other technical details. Starting a variable with {{! will prevent escaping special characters in command palette."});

        // Confirm execution field
        new Setting(container_element)
            .setName("Ask confirmation before execution")
            .addToggle(toggle => toggle
                .setValue(this.t_shell_command.getConfirmExecution())
                .onChange(async (value) => {
                    this.t_shell_command.getConfiguration().confirm_execution = value;
                    let icon_container = this.name_setting.nameEl.find("span.shell-commands-confirm-execution-icon-container");
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
        this.newOutputChannelSetting(container_element, "Output channel for stdout", "stdout");
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

        // Ignore errors field
        new Setting(container_element)
            .setName("Ignore error codes")
            .setDesc("A comma separated list of numbers. If executing a shell command fails with one of these exit codes, no error message will be displayed, and the above stderr channel will be ignored. Stdout channel will still be used for stdout. Error codes must be integers and greater than or equal to 1. Anything else will be removed.")
            .addText(text => text
                .setValue(this.t_shell_command.getIgnoreErrorCodes().join(","))
                .onChange(async (value) => {
                    // Parse the string of comma separated numbers
                    let ignore_error_codes: number[] = [];
                    let raw_error_codes = value.split(",");
                    for (let i in raw_error_codes) {
                        let raw_error_code = raw_error_codes[i];
                        let error_code_candidate = parseInt(raw_error_code.trim()); // E.g. an empty string converts to NaN (= Not a Number).
                        // Ensure that the error code is not NaN, 0 or a negative number.
                        if (!isNaN(error_code_candidate) && error_code_candidate >= 1) {
                            // The candidate is legit.
                            ignore_error_codes.push(error_code_candidate);
                        }
                    }

                    // Save the validated error numbers
                    this.t_shell_command.getConfiguration().ignore_error_codes = ignore_error_codes;
                    await this.plugin.saveSettings();

                    // Update icon
                    let icon_container = this.name_setting.nameEl.find("span.shell-commands-ignored-error-codes-icon-container");
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
        for (platform_id in PlatformNames) {
            createPlatformSpecificShellCommandField(this.plugin, container_element, this.t_shell_command, platform_id, this.plugin.settings.show_autocomplete_menu);
        }

        // Platform specific shell selection
        createShellSelectionField(this.plugin, container_element, this.t_shell_command.getShells(), false);
    }

    public activateTab(tab_id: string) {
        if (undefined === this.tab_structure.buttons[tab_id]) {
            throw Error("Invalid tab id: " + tab_id);
        }
        this.tab_structure.buttons[tab_id].click();
    }

    private newOutputChannelSetting(container_element: HTMLElement, title: string, output_stream_name: OutputStream, description: string = "") {
        let output_channel_options = getOutputChannelDriversOptionList(output_stream_name);
        new Setting(container_element)
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