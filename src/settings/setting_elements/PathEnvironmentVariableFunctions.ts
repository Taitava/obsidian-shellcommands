/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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

import {
    Setting,
    TextAreaComponent,
} from "obsidian";
import SC_Plugin from "../../main";
import {
    IPlatformSpecificString,
    PlatformId,
    PlatformNames,
} from "../SC_MainSettings";
import {
    getOperatingSystem,
    gotoURL,
} from "../../Common";
import {ConfirmationModal} from "../../ConfirmationModal";
import {createAutocomplete} from "./Autocomplete";
import {DocumentationPATHAugmentationsLink} from "../../Documentation";

export function createPATHAugmentationFields(plugin: SC_Plugin, container_element: HTMLElement, path_augmentations: IPlatformSpecificString) {

    const path_variable_name = getPATHEnvironmentVariableName();
    new Setting(container_element)
        .setName(`Add directories to the ${path_variable_name} environment variable`)
        .setHeading()
        .setDesc(`This is sometimes needed in order to be able to call some user installed applications. The directories will be appended AFTER the default directories in ${path_variable_name}, unless {{environment:${path_variable_name}}} is included. Other {{variables}} can be used, too, but they don't affect the appending order.`)

        // An icon for showing the current PATH content.
        .addExtraButton(button => button
            .setIcon("bullet-list")
            .setTooltip(`Show the current ${path_variable_name} content (without any additions).`)
            .onClick(() => {
                const modal = new ConfirmationModal(
                    plugin,
                    `Current ${path_variable_name} content`,
                    process.env.PATH,
                    "Close",
                )
                modal.open();
            }),
        )

        // Help link
        .addExtraButton(button => button
            .setIcon("help")
            .setTooltip(`Documentation: Additions to the ${path_variable_name} environment variable`)
            .onClick(() => gotoURL(DocumentationPATHAugmentationsLink))
        )
    ;

    // Create a field for each operating system.
    const sub_container_element = container_element.createDiv();
    sub_container_element.addClass("SC-setting-group");
    let platform_id: PlatformId;
    for (platform_id in PlatformNames) {
        const platform_name = PlatformNames[platform_id];

        new Setting(sub_container_element).setName(platform_name + " " + getPATHEnvironmentVariableName(platform_id) + " additions")
            .setDesc("Define each directory on a separate line, or multiple directories on one line, separated by " + getPATHSeparator(platform_id, true))
            .addTextArea(textarea => textarea
                .setValue(path_augmentations[platform_id] ?? "")
                .onChange(async (new_path_augmentation: string) => {
                    // PATH augmentation has been changed.
                    // Update the configuration.
                    if (new_path_augmentation.length > 0) {
                        // The augmentation has content.
                        path_augmentations[platform_id] = new_path_augmentation;
                    } else {
                        // The augmentation has been removed.
                        delete path_augmentations[platform_id];
                    }
                    await plugin.saveSettings();
                })
                .then((textarea_component: TextAreaComponent) => {
                    // Add an autocomplete menu.
                    createAutocomplete(plugin, textarea_component.inputEl as unknown as HTMLInputElement, () => textarea_component.onChanged());
                })
            )
        ;
    }
}

export function getPATHSeparator(platform_id: PlatformId, verbose = false) {
    switch (platform_id) {
        case "linux":
        case "darwin": // This is macOS.
            return verbose ? "a colon :" : ":";
        case "win32":
            return verbose ? "a semicolon ;" : ";";
    }
}

export function convertNewlinesToPATHSeparators(path: string, platform_id: PlatformId) {
    const separator = getPATHSeparator(platform_id);
    return path.replace(
        /(\r\n|\r|\n)+/gu, // + means that multiple adjacent newlines can be combined into a single separator character.
        () => separator, // The replacement is a callback in order to avoid problems with $ characters, although that problem would only occur if the separator would contain a $ character, which is does not, but fix it anyway.
    );
}

/**
 * Retrieves a PATH environment variable augmentation string (specific to the current operating system) from the plugin's
 * configuration. Returns it WITHOUT parsing possible variables in the string. If the current operating system does not
 * have a dedicated PATH augmentation string in the configuration, returns null.
 *
 * @param plugin
 */
export function getPATHAugmentation(plugin: SC_Plugin): string | null {
    return plugin.settings.environment_variable_path_augmentations[getOperatingSystem()] ?? null;
}

/**
 * Returns OS specific name for the PATH environment variable. For Windows its Path, but for macOS and Linux its PATH, so
 * the only difference is casing.
 */
export function getPATHEnvironmentVariableName(platform_id: PlatformId = getOperatingSystem()) {
    switch (platform_id) {
        case "darwin":
        case "linux":
            return "PATH";
        case "win32":
            return "Path";
    }
}