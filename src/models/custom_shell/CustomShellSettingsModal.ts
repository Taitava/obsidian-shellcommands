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

import {SC_Modal} from "../../SC_Modal";
import SC_Plugin from "../../main";
import {
    Setting,
} from "obsidian";
import {CustomShellInstance} from "./CustomShellInstance";
import {
    PlatformId,
    PlatformNames,
    PlatformNamesMap,
} from "../../settings/SC_MainSettings";
import {getOperatingSystem} from "../../Common";
import {CreateShellCommandFieldCore} from "../../settings/setting_elements/CreateShellCommandFieldCore";
import {ShellCommandExecutor} from "../../ShellCommandExecutor";
import {
    parseVariables,
    ParsingResult,
} from "../../variables/parseVariables";
import {CustomShell} from "../../shells/CustomShell";
import {CustomShellModel} from "./CustomShellModel";

export class CustomShellSettingsModal extends SC_Modal {

    private approved = false;

    constructor(
        plugin: SC_Plugin,
        private readonly customShellInstance: CustomShellInstance,

        /** Can be undefined if the instance is created from a place where there is no name element. */
        private readonly nameSetting?: Setting,

        /** If defined, a button will be added and onAfterApproval() / onAfterCancelling() will be called depending on whether the button was clicked or not. */
        private readonly okButtonText?: string,
        private readonly onAfterApproval?: () => void,
        private readonly onAfterCancelling?: () => void,
    ) {
        super(plugin);
    }

    public onOpen(): void {
        super.onOpen();
        const containerElement = this.modalEl;
        const titleAndDescriptionGroupElement = containerElement.createDiv({attr: {class: "SC-setting-group"}});

        // Name
        const title_setting = new Setting(titleAndDescriptionGroupElement)
            .setName("Shell name")
            .setDesc("A label used to select the shell in settings.")
            .addText(text => text
                .setValue(this.customShellInstance.configuration.name)
                .onChange(async (newName: string) => {
                    this.customShellInstance.configuration.name = newName;
                    await this.plugin.saveSettings();

                    // Update the title in a name setting. (Only if the modal was created from a place where a CustomShellInstance name element exists).
                    this.nameSetting?.setName(newName);
                })
            )
        ;
        const nameInputElement: HTMLInputElement = title_setting.controlEl.find("input") as HTMLInputElement;

        // Focus on the name field.
        nameInputElement.focus();

        // Description
        new Setting(titleAndDescriptionGroupElement)
            .setName("Description")
            .addTextArea(textarea => textarea
                .setValue(this.customShellInstance.configuration.description)
                .onChange(async (newDescription: string) => {
                    this.customShellInstance.configuration.description = newDescription;
                    await this.plugin.saveSettings();

                    // Update the description in a name setting. (Only if the modal was created from a place where a CustomShellInstance name element exists).
                    this.nameSetting?.setDesc(newDescription);
                })
            )
        ;

        // Binary path
        new Setting(containerElement.createDiv({attr: {class: "SC-setting-group"}}))
            .setName("Executable binary file path")
            .setDesc("This should only contain a directory and a file name (or just a file name), not any possible command line options/arguments. They will be configured below.")
            .addText(textComponent => textComponent
                .setValue(this.customShellInstance.configuration.binary_path)
                .onChange(async (newBinaryPath: string) => {
                    this.customShellInstance.configuration.binary_path = newBinaryPath;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Supported operating systems
        new Setting(containerElement)
            .setName("Supported operating systems")
            .setDesc("Select all operating systems that you have this shell installed on. Note that in case your shell belongs to a sub-operating system (e.g. Windows Subsystem for Linux, WSL), you need to select the *host* system, as the sub-system's operating system does not matter here.")
            .setHeading()
        ;
        const supportedPlatformsContainer = containerElement.createDiv({attr: {class: "SC-setting-group"}});
        for (const [platformId, platformName] of PlatformNamesMap) {
            this.createSupportedHostPlatformField(supportedPlatformsContainer, platformId, platformName);
        }

        // Shell operating system
        const hostPlatformName = PlatformNames[getOperatingSystem()];
        new Setting(containerElement)
            .setName("Shell's operating system")
            .setDesc("If the shell virtualizes, uses as a subsystem, or otherwise emulates another operating system than the current host (" + hostPlatformName + "), select it here. This is used to make directory paths etc. work correctly.")
            .addDropdown(dropdownComponent => dropdownComponent
                .addOption("none", "Same as the current host (" + hostPlatformName + ")")
                .addOptions(PlatformNames as Record<string, string>) // FIXME: Find a better way to tell TypeScript that PlatformNames is of a correct type.
                .setValue(this.customShellInstance.configuration.shell_platform ?? "none")
                .onChange(async (newShellPlatform: string) => {
                    switch (newShellPlatform as PlatformId | "none") {
                        case "none":
                            this.customShellInstance.configuration.shell_platform = null;
                            break;
                        default:
                            this.customShellInstance.configuration.shell_platform = newShellPlatform as PlatformId;
                    }
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Special characters escaping // TODO: Create a div.SC-setting-group
        new Setting(containerElement)
            .setName("Special characters escaping")
            .setDesc("Used to quote special characters (= other than alphabets, numbers and _) in {{variable}} values.")
            .addDropdown(dropdownComponent => dropdownComponent
                .addOptions({
                    "UnixShell": "Unix shell style with \\ as escape character",
                    "PowerShell": "PowerShell style with ` as escape character",
                    "none": "No escaping (not recommended)",
                })
                .setValue(this.customShellInstance.configuration.escaper)
                .onChange(async (newEscaper) => {
                    this.customShellInstance.configuration.escaper = newEscaper as "UnixShell" | "PowerShell" | "none";
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Path translator
        const pathTranslatorContainer = containerElement.createDiv({attr: {class: "SC-setting-group"}});
        new Setting(pathTranslatorContainer)
            .setName("Path translator")
            .setDesc("Some shells introduce sub-environments where the same file is referred to using a different path than in the host operating system. A custom JavaScript function can be defined to convert file paths from the host operating system's format to the one expected by the target system. Note that no directory separator changes are needed to be done here - they are already changed based on the 'Shell's operating system' setting, if needed. Path translation is optional.")
            .setClass("SC-path-translator-setting")
            .addTextArea(textareaComponent => textareaComponent // TODO: Make the textarea grow based on content height.
                .setValue(this.customShellInstance.configuration.path_translator ?? "")
                .onChange(async (newPathTranslator: string) => {
                    if ("" === newPathTranslator.trim()) {
                        // Disable translator
                        this.customShellInstance.configuration.path_translator = null;
                    } else {
                        // Enable or update translator
                        this.customShellInstance.configuration.path_translator = newPathTranslator;
                    }
                    await this.plugin.saveSettings();
                })
            )
        ;
        new Setting(pathTranslatorContainer)
            .setDesc("The JavaScript code will be enclosed in a function that receives the following parameters: 'path' is the file/folder path needed to be translated. 'type' is either \"absolute\" or \"relative\". If absolute, the path starts from the beginning of the file system. If relative, the path starts from the Obsidian vault's root folder. The function should return the converted path.")
        ;
        new Setting(pathTranslatorContainer)
            .setDesc("The function SHOULD NOT CAUSE side effects! It must not alter any data outside it. Try to keep the function short and simple, as possible errors are hard to inspect.")
        ;

        // Shell testing field.
        this.createShellTestField(containerElement);

        // Ok button
        const okButtonText: string | undefined = this.okButtonText;
        if (okButtonText) {
            new Setting(containerElement)
                .addButton(button => button
                    .setButtonText(okButtonText)
                    .onClick(() => this.approve()),
                )
            ;
        }
    }

    private createSupportedHostPlatformField(containerElement: HTMLElement, platformId: PlatformId, platformName: string) {
        new Setting(containerElement)
            .setName("Enable on " + platformName)
            .addToggle(toggleComponent => toggleComponent
                .setValue(this.customShellInstance.configuration.host_platforms[platformId].enabled)
                .onChange(async (enable: boolean) => {
                    if (enable) {
                        // Enable this host platform.
                        this.customShellInstance.enableHostPlatform(platformId);
                        await this.plugin.saveSettings();
                    } else {
                        // Disable this host platform - but only if the shell is not in use.
                        const disablingResult = this.customShellInstance.disableHostPlatformIfNotUsed(platformId);
                        if ("string" === typeof disablingResult) {
                            // Cannot disable.
                            this.plugin.newError("Cannot disable this shell on " + platformName + " because it's used by: " + disablingResult);
                            toggleComponent.setValue(true); // Re-enable.
                        } else {
                            // Save the disabling.
                            await this.plugin.saveSettings();
                        }
                    }

                    // Show or hide any platform specific settings.
                    updatePlatformSpecificSettingsVisibility(enable);
                }),
            )
            // TODO: Add an icon button for opening up a list of shell commands that allows assigning this shell for the particular shell command on this platform. Disable clicking the icon if the toggle created above is off.
        ;

        // Platform specific settings.
        let platformSpecificSettingsContainer: HTMLElement;
        const updatePlatformSpecificSettingsVisibility = (enabled: boolean) => platformSpecificSettingsContainer?.[enabled ? "removeClass" : "addClass"]("SC-hide");
        if (platformId === "win32") {
            // Create Windows specific settings.
            platformSpecificSettingsContainer = containerElement.createDiv({attr: {class: 'SC-indent'}});
            this.createHostPlatformWindowsSpecificSettings(platformSpecificSettingsContainer);

            // Update Windows settings visibility immediately.
            updatePlatformSpecificSettingsVisibility(this.customShellInstance.configuration.host_platforms.win32.enabled);
        }
        // If platform is not Windows, platformSpecificSettingsContainer will stay empty, and
        // updatePlatformSpecificSettingsVisibility() toggles the visibility of an empty container. Not neat, but should
        // not cause problems, and at least it should offer an easy-ish way to later add settings for other platforms, too.
    }

    private createHostPlatformWindowsSpecificSettings(containerElement: HTMLElement) {
        /* Enable this heading if Windows will have more than one setting. Then remove the texts "Windows: " and "The setting doesn't affect macOS/Linux" below.
        new Setting(containerElement)
            .setName("Windows specific")
            .setHeading()
            .setDesc("These settings are only used when your workstation uses Windows.")
        ;
        */

        // 'Quote shell arguments' setting.
        const quoteShellArgumentsInitialValue: boolean =
            this.customShellInstance.configuration.host_platforms.win32.quote_shell_arguments // Use value from user configuration if defined.
            ?? CustomShellModel.getDefaultHostPlatformWindowsConfiguration(true).quote_shell_arguments // Otherwise get a default value.
        ;
        new Setting(containerElement)
            .setName("Windows: Quote shell arguments")
            .setDesc('Wraps shell arguments in double quotes if they contain spaces (e.g. echo Hi becomes "echo Hi"). If arguments contain double quotes already, they are escaped by preceding them with a backslash (e.g. echo "Hi there" becomes "echo \\"Hi there\\""). If your shell complains that a command does not exist, try changing this setting. (The setting doesn\'t affect macOS/Linux. The quoting is done by Node.js, not by the SC plugin.)')
            .setClass("SC-full-description")
            .addToggle(toggleComponent => toggleComponent
                .setValue(quoteShellArgumentsInitialValue)
                .onChange(async (quoteShellArgumentsNewValue: boolean) => {
                    this.customShellInstance.configuration.host_platforms.win32.quote_shell_arguments = quoteShellArgumentsNewValue;
                    await this.plugin.saveSettings();
                })
            )
        ;
    }

    private createShellTestField(containerElement: HTMLElement) {
        // Test the shell.
        containerElement.createEl("hr"); // Separate non-savable form fields visually from savable settings fields.
        let testShellCommandContent = "";
        const customShell: CustomShell = this.customShellInstance.getCustomShell();
        const testSettingsContainer: HTMLElement = containerElement.createDiv({attr: {class: "SC-setting-group"}});
        new Setting(testSettingsContainer)
        .setName("Execute a test command using the shell")
        .setDesc("The content of this field is not saved anywhere! It's meant for temporary testing only. {{variables}} are supported. Output appears in a notification balloon. When playing around, keep in mind that the command is really executed, so avoid using possibly dangerous commands.")
        .setClass("SC-full-description")
        .addExtraButton(button => button
            .setTooltip("Execute the test command using this shell.")
            .setIcon("run-command")
            .onClick(async () => {
                const testShellCommandParsingResult: ParsingResult = await parseVariables(
                    this.plugin,
                    testShellCommandContent,
                    customShell,
                    true, // Enable escaping, but if this.customShellInstance.configuration.escaper is "none", then escaping is prevented anyway.
                    null, // No TShellCommand, so no access for default values.
                    null, // This execution is not launched by an event.
                );
                if (testShellCommandParsingResult.succeeded) {
                    // Can execute.
                    const childProcess = customShell.spawnChildProcess(
                        testShellCommandParsingResult.parsed_content as string,
                        {
                            cwd: ShellCommandExecutor.getWorkingDirectory(this.plugin),
                            env: undefined, // TODO: Consider adding support for PATH augmentation here. It would require parsing this.plugin.settings.environment_variable_path_augmentations and extracting environment variable handling logic from ShellCommandExecutor.executeShellCommand() into a new, static method in that class and then calling it from here.
                        }
                    );
                    if (null === childProcess) {
                        // No spawn() call was made due to some shell configuration error. Just cancel everything.
                        return;
                    }
                    childProcess.on("error", (error: Error) => {
                        // Probably most errors will NOT end up here, I guess this event occurs for some rare errors.
                        this.plugin.newError("Shell test failed to execute. Error: " + error.message);
                    });
                    childProcess.on("exit", (exitCode: number | null) => {
                        // exitCode is null if user terminated the process. Reference: https://nodejs.org/api/child_process.html#event-exit (read on 2022-11-27).

                        // Show outputs.
                        let notified = false;
                        if (null === childProcess.stdout || null == childProcess.stderr) {
                            throw new Error("Child process's stdout and/or stderr stream is null.");
                        }
                        childProcess.stdout.setEncoding("utf8"); // Receive stdout and ...
                        childProcess.stderr.setEncoding("utf8"); // ... stderr as strings, not as Buffer objects.
                        const stdout: string = childProcess.stdout.read();
                        const stderr: string = childProcess.stderr.read();
                        if (stdout) {
                            this.plugin.newNotification(stdout);
                            notified = true;
                        }
                        if (stderr) {
                            this.plugin.newError("[" + exitCode + "]: " + stderr);
                            notified = true;
                        }
                        if (!notified) {
                            this.plugin.newNotification("Shell test finished. No output was received.");
                        }
                    });
                } else {
                    // Some variable has failed.
                    this.plugin.newErrors(testShellCommandParsingResult.error_messages);
                }
            }),
        );
        CreateShellCommandFieldCore(
            this.plugin,
            testSettingsContainer,
            "",
            testShellCommandContent,
            customShell,
            null, // No need to pass a TShellCommand. It would only be used for accessing variable default values in a preview text.
            this.plugin.settings.show_autocomplete_menu,
            (newTestShellCommandContent: string) => testShellCommandContent = newTestShellCommandContent,
            "Enter a temporary shell command for testing."
        ).shell_command_setting.setClass("SC-no-description");
        new Setting(testSettingsContainer)
        .setDesc("(If you have defined additions to the PATH environment variable in this plugin's settings, they do NOT work in this test. Maybe in the future. However, they should work when you execute real shell commands using this shell.)")
        .setClass("SC-full-description")
        ;
    }

    protected approve(): void {
        if (this.onAfterApproval) {
            this.approved = true;
            this.onAfterApproval();
        }
        this.close();
    }

    public onClose(): void {
        super.onClose();

        // Call a cancelling hook if one is defined (and if the closing happens due to cancelling, i.e. the ok button is NOT clicked).
        if (!this.approved && this.onAfterCancelling) {
            this.onAfterCancelling();
        }
    }
}