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
import {
    getPATHEnvironmentVariableName,
} from "../../imports";
import {CustomShellInstance} from "./CustomShellInstance";
import {
    PlatformId,
    PlatformNames,
} from "../../settings/SC_MainSettings";

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
        new Setting(containerElement) // TODO: Create a div.SC-setting-group
            .setName("Executable binary file path")
            .setDesc("Can be absolute, or relative from the working directory defined in the main settings pane.")
            .addText(textComponent => textComponent
                .setValue(this.customShellInstance.configuration.binary_path)
                .onChange(async (newBinaryPath: string) => {
                    this.customShellInstance.configuration.binary_path = newBinaryPath;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Supported operating systems
        const supportedPlatformsContainer = containerElement.createDiv({attr: {class: "SC-settings-group"}});
        new Setting(supportedPlatformsContainer)
            .setName("Supported operating systems")
            .setDesc("Select all operating systems that you have this shell installed on. Note that in case your shell belongs to a sub-operating system (e.g. Windows Subsystem for Linux, WSL), you need to select the *host* system, as the sub-system's operating system does not matter here.")
            .setHeading()
        ;
        let platformId: PlatformId;
        for (platformId in PlatformNames) {
            const platformName: string = PlatformNames[platformId] as string;
            new Setting(supportedPlatformsContainer)
                .setName("Enable on " + platformName)
                .addToggle(toggleComponent => toggleComponent
                    .setValue(this.customShellInstance.configuration.supported_platforms.includes(platformId))
                    .onChange(async (shouldInclude: boolean) => {
                        if (shouldInclude) {
                            // Add to supported platforms
                            this.customShellInstance.configuration.supported_platforms.push(platformId);
                        } else {
                            // Remove from supported platforms
                            this.customShellInstance.configuration.supported_platforms.remove(platformId);
                        }
                        await this.plugin.saveSettings();
                    }),
                )
            ;
        }

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

        // Directory separator // TODO: Create a div.SC-setting-group
        new Setting(containerElement)
            .setName("Directory separator")
            .setDesc("The character between folder names, e.g. myFolder/anotherFolder vs. myFolder\\anotherFolder.")
            .addDropdown(dropdownComponent => dropdownComponent
                .addOptions({
                    "platform": "Same as the current host operating system uses",
                    "\\": "Backslash \\",
                    "/": "Forward slash /",
                })
                .setValue(this.customShellInstance.configuration.directory_separator)
                .onChange(async (newSeparator) => {
                    this.customShellInstance.configuration.directory_separator = newSeparator as "\\" | "/" | "platform";
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Path separator // TODO: Create a div.SC-setting-group
        new Setting(containerElement)
            .setName("Path separator")
            .setDesc("The character separating multiple file paths. Used when adding folders to the " + getPATHEnvironmentVariableName() + " environment variable.")
            .addDropdown(dropdownComponent => dropdownComponent
                .addOptions({
                    "platform": "Same as the current host operating system uses",
                    ":": "Colon :",
                    ";": "Semicolon ;",
                })
                .setValue(this.customShellInstance.configuration.path_separator)
                .onChange(async (newSeparator) => {
                    this.customShellInstance.configuration.path_separator = newSeparator as ":" | ";" | "platform";
                    await this.plugin.saveSettings();
                })
            )
        ;

        // Path translator
        const pathTranslatorContainer = containerElement.createDiv({attr: {class: "SC-setting-group"}});
        new Setting(pathTranslatorContainer)
            .setName("Path translator")
            .setDesc("Some shells introduce sub-environments where the same file is referred to using a different path than in the host operating system. A custom JavaScript function can be defined to convert file paths from the host operating system's format to the one expected by the target system. Note that no directory separator changes are needed to be done here - they are already changed based on the 'Directory separator' setting, if needed. Path translation is optional.")
            .setClass("SC-path-translator-setting")
            .addTextArea(textareaComponent => textareaComponent
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
            .setDesc("The JavaScript code will be enclosed in a function that receives the following parameters: 'path' is the file/folder path needed to be translated. 'mode' is either \"absolute\" or \"relative\". If absolute, the path starts from the beginning of the file system. If relative, the path starts from the Obsidian vault's root folder. The function should return the converted path.")
        ;
        new Setting(pathTranslatorContainer)
            .setDesc("The function SHOULD NOT CAUSE side effects! It must not alter any data outside it. Try to keep the function short and simple, as possible errors are hard to inspect.")
        ;


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