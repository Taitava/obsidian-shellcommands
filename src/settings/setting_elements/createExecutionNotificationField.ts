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
import {ExecutionNotificationMode} from "../SC_MainSettings";
import {Setting} from "obsidian";

/**
 * Creates a dropdown setting for specifying the execution notification mode.
 *
 * @param {HTMLElement} containerElement - The container element to append the setting to.
 * @param {ExecutionNotificationMode} currentValue - The current value of the dropdown.
 * @param {false | ExecutionNotificationMode} defaultValue This decides the dropdown's mode: for main settings, set to false. For shell command specific settings, set to the value that the main settings has. If it's false, no "Default ()" option will be present.
 * @param notificationMessageDuration Used for the "Show for _ seconds" options. This should be retrieved from the main configuration.
 * @param {(newExecutionNotificationMode: ExecutionNotificationMode | null) => void} onChange - The callback function to be called when the value of the dropdown changes.
 * @returns {void}
 */
export function createExecutionNotificationField( // Shell command specific settings.
    containerElement: HTMLElement,
    currentValue: ExecutionNotificationMode | null,
    defaultValue: ExecutionNotificationMode,
    notificationMessageDuration: number,
    onChange: (newExecutionNotificationMode: ExecutionNotificationMode | null) => void,
): void
export function createExecutionNotificationField(  // Main settings.
    containerElement: HTMLElement,
    currentValue: ExecutionNotificationMode,
    defaultValue: false,
    notificationMessageDuration: number,
    onChange: (newExecutionNotificationMode: ExecutionNotificationMode) => void,
): void
export function createExecutionNotificationField(
    containerElement: HTMLElement,
    currentValue: ExecutionNotificationMode | null,
    defaultValue: false | ExecutionNotificationMode,
    notificationMessageDuration: number,
    onChange: ((newExecutionNotificationMode: ExecutionNotificationMode | null) => void) | // Shell command specific settings.
              ((newExecutionNotificationMode: ExecutionNotificationMode) => void), // Main settings.
): void {
    const executionNotificationOptions: Partial<Record<ExecutionNotificationMode | "default", string>> = { // Partial because "default" is not always present.
        "default": "", // Will get a value later, or gets removed.
        "disabled": "Do not show",
        "quick": "Show for " + notificationMessageDuration + " seconds",
        "permanent": "Show until the process is finished",
        "if-long": "Show only if executing takes long",
    };
    let title: string;
    if (false === defaultValue) {
        // Main settings.
        title = "Show a notification when executing shell commands";
        delete executionNotificationOptions.default;
    } else {
        // Shell command specific settings.
        title = "Show a notification when executing";
        executionNotificationOptions["default"] = "Default (" + executionNotificationOptions[defaultValue] + ")";
    }
    new Setting(containerElement)
        .setName(title)
        .addDropdown(dropdown_component => dropdown_component
            .addOptions(executionNotificationOptions)
            .setValue((currentValue === null) ? "default" : currentValue)
            .onChange((newExecutionNotificationMode: string) => {
                if ("default" === newExecutionNotificationMode && defaultValue !== false) {
                    // Change 'default' to null.
                    // @ts-ignore Null is allowed in the onChange() function's signature.
                    onChange(null);
                } else {
                    // newExecutionNotificationMode is a real ExecutionNotificationMode value.
                    onChange(newExecutionNotificationMode as ExecutionNotificationMode);
                }
            }),
        )
    ;
}