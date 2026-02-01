/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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

import SC_Plugin from "../../main";
import {
    GlobalVariableDefaultValueConfiguration,
    InheritableVariableDefaultValueConfiguration,
    Variable,
    VariableDefaultValueType,
    VariableDefaultValueTypeWithInherit,
} from "../../variables/Variable";
import * as obsidian from "obsidian";
import {
    apiVersion,
    App,
    Setting,
    TextAreaComponent,
} from "obsidian";
import {createAutocomplete} from "./Autocomplete";
import {TShellCommand} from "../../TShellCommand";
import {CustomVariable} from "../../variables/CustomVariable";
import {gotoURL, isApiVersionAtLeast} from "../../Common";

export function createVariableDefaultValueFields(plugin: SC_Plugin, containerElement: HTMLElement, targetObject: Variable | TShellCommand) {

    // Add default value fields for each variable that can have a default value.
    for (const variable of plugin.getVariables()) {

        // Only add fields for variables that are not always accessible.
        if (!variable.isAlwaysAvailable()) {
            const setting = createVariableDefaultValueField(
                plugin,
                containerElement,
                variable.getFullName(),
                variable,
                targetObject
            );

            // Documentation link
            if (!(variable instanceof CustomVariable)) {
                setting.addExtraButton(extraButton => extraButton
                    .setIcon("help")
                    .setTooltip("Documentation: " + variable.getFullName() + " variable")
                    .onClick(() => gotoURL(variable.getDocumentationLink() as string)), // It's always a string, because the variable is not a CustomVariable.
                );
            }
        }
    }

}

/**
 *
 * @param plugin
 * @param containerElement
 * @param settingName
 * @param variable The variable whose default value will be configured by the created setting field.
 * @param targetObject In which object's configuration the default value settings should be stored. Can be a TShellCommand or a Variable (either CustomVariable or a built-in one). If not set, the `variable` parameter will be used as a target.
 * @param onChange Called after the `type` or `value` of the default value configuration changes.
 */
export function createVariableDefaultValueField(
        plugin: SC_Plugin,
        containerElement: HTMLElement,
        settingName: string,
        variable: Variable,
        targetObject?: Variable | TShellCommand,
        onChange?: () => void,
    ): Setting {

    if (undefined === targetObject) {
        // No configuration target is defined, so use the variable as a target.
        targetObject = variable;
    }

    const targetType =
        targetObject instanceof TShellCommand
            ? 'tShellCommand'
            : targetObject instanceof CustomVariable
                ? 'customVariable'
                : 'builtinVariable'
    ;

    if ("customVariable" === targetType || "builtinVariable" === targetType) {
        if (targetObject !== variable) {
            throw new Error("If defining 'targetObject' argument as a Variable, it should be the same as the 'variable' argument.");
        }
    }

    // Get an identifier for a variable (an id, if it's a CustomVariable, otherwise the variable's name).
    const variableIdentifier = variable.getIdentifier();

    // If a default value has been defined for this variable (and this targetObject), retrieve the configuration.
    let defaultValueConfiguration: GlobalVariableDefaultValueConfiguration | InheritableVariableDefaultValueConfiguration | null;
    switch (targetType) {
        case "tShellCommand":
            defaultValueConfiguration = (targetObject as TShellCommand).getDefaultValueConfigurationForVariable(variable);
            break;
        case "builtinVariable": // Both classes have...
        case "customVariable":  // ... the getGlobalDefaultValueConfiguration() method.
            defaultValueConfiguration = (targetObject as Variable | CustomVariable).getGlobalDefaultValueConfiguration();
            break;
    }

    // A function for creating configuration in onChange() callbacks if the variable does not yet have one for this configuration.
    const createDefaultValueConfiguration = () => {
        const configuration: GlobalVariableDefaultValueConfiguration /* This type should be compatible also when assigning the configuration to a TShellCommand, which actually uses InheritableVariableDefaultValueConfiguration instead of Global*. */ = {
            type: "show-errors",
            value: "",
        };

        // Store the configuration to the target object's configuration.
        switch (targetType) {
            case "tShellCommand":
                (targetObject as TShellCommand).getConfiguration().variable_default_values[variableIdentifier] = configuration;
                break;
            case "builtinVariable":
                if (undefined === plugin.settings.builtin_variables[variableIdentifier]) {
                    // Create a config object for this variable if it does not exist yet.
                    plugin.settings.builtin_variables[variableIdentifier] = {default_value: null};
                }
                plugin.settings.builtin_variables[variableIdentifier].default_value = configuration;
                break;
            case "customVariable":
                (targetObject as CustomVariable).getConfiguration().default_value = configuration;
                break;
        }
        return configuration;
    };

    let textareaComponent: TextAreaComponent;
    let secretContainerEl: HTMLElement | null = null;

    // Keyring (SecretStorage) is available only in Obsidian 1.11.4+. Use apiVersion for correct detection (e.g. 1.11.7).
    const appWithSecrets = plugin.app as { secretStorage?: { getSecret: (id: string) => Promise<string | null> } };
    const hasSecretStorage = isApiVersionAtLeast(apiVersion, "1.11.4") &&
        typeof appWithSecrets.secretStorage?.getSecret === "function";

    // A function for updating textarea and SecretComponent container visibility.
    const updateTextareaComponentVisibility = (type: string) => {
        if ("value" === type) {
            textareaComponent.inputEl.removeClass("SC-hide");
            if (secretContainerEl) secretContainerEl.addClass("SC-hide");
        } else if ("from-keyring" === type) {
            textareaComponent.inputEl.addClass("SC-hide");
            if (secretContainerEl) secretContainerEl.removeClass("SC-hide");
        } else {
            textareaComponent.inputEl.addClass("SC-hide");
            if (secretContainerEl) secretContainerEl.addClass("SC-hide");
        }
    };

    // Define a set of options for default value type. Only add "from-keyring" when Obsidian >= 1.11.4 (do not show for older versions).
    const defaultValueTypeOptions: Record<string, string> = {
        "inherit": "", // Will be updated or deleted below.
        "show-errors": "Cancel execution and show errors",
        "cancel-silently": "Cancel execution silently",
        "value": "Execute with value:",
        ...(hasSecretStorage ? { "from-keyring": "Execute with value from Keyring" } : {}),
    };
    switch (targetType) {
        case "tShellCommand": {
            // Shell commands can have the "inherit" type.
            const globalDefaultValueConfiguration: GlobalVariableDefaultValueConfiguration | null = variable.getGlobalDefaultValueConfiguration();
            const globalDefaultValueType: VariableDefaultValueType = globalDefaultValueConfiguration ? globalDefaultValueConfiguration.type : "show-errors";
            defaultValueTypeOptions.inherit = "Inherit: " + (defaultValueTypeOptions[globalDefaultValueType] ?? globalDefaultValueType);
            if ("value" === globalDefaultValueType) {
                defaultValueTypeOptions.inherit += " " + globalDefaultValueConfiguration?.value;
            } else if ("from-keyring" === globalDefaultValueType) {
                defaultValueTypeOptions.inherit = "Inherit: From Keyring";
            }
            break;
        }
        case "builtinVariable":
        case "customVariable": {
            // Variables do not have the "inherit" type.
            // @ts-ignore Don't yell about removing a non-optional property "inherit".
            delete defaultValueTypeOptions.inherit;
        }
    }

    // Create the default value setting
    let defaultValueTextareaComponent: TextAreaComponent | undefined;
    const defaultValueSetting: Setting = new Setting(containerElement)
        .setName(settingName)
        .setDesc("If not available, then:")
        .setTooltip(variable.getAvailabilityTextPlain())
        .addDropdown(dropdown => dropdown
            .addOptions(defaultValueTypeOptions)
            .setValue(
                (() => {
                    const raw = defaultValueConfiguration ? defaultValueConfiguration.type : "tShellCommand" === targetType ? "inherit" : "show-errors";
                    const fallback = "tShellCommand" === targetType ? "inherit" : "show-errors";
                    return (raw === "from-keyring" && !hasSecretStorage) ? fallback : raw;
                })()
            )
            .onChange(async (newType: VariableDefaultValueTypeWithInherit) => {
                if (!defaultValueConfiguration) {
                    defaultValueConfiguration = createDefaultValueConfiguration();
                }

                // Set the new type
                const previousType = defaultValueConfiguration.type;
                defaultValueConfiguration.type = newType;
                // When switching from "from-keyring" to "value", clear value so the text field does not show the secret id.
                if (newType === "value" && previousType === "from-keyring") {
                    defaultValueConfiguration.value = "";
                }
                if (targetType === "tShellCommand") {
                    // Shell commands:
                    if ("inherit" === newType && defaultValueConfiguration.value === "") {
                        // If "inherit" is selected and no text value is typed, the configuration file can be cleaned up by removing this configuration object completely.
                        // Prevent deleting, if a text value is present, because the user might want to keep it if they will later change 'type' to 'value'.
                        delete (targetObject as TShellCommand).getConfiguration().variable_default_values[variableIdentifier];
                    }
                } else {
                    // Variables:
                    if ("show-errors" === newType && defaultValueConfiguration.value === "") {
                        // If "show-errors" is selected and no text value is typed, the configuration file can be cleaned up by removing this configuration object completely.
                        // Prevent deleting, if a text value is present, because the user might want to keep it if they will later change 'type' to 'value'.
                        switch (targetType) {
                            case "builtinVariable":
                                plugin.settings.builtin_variables[variableIdentifier].default_value = null;
                                break;
                            case "customVariable":
                                (targetObject as CustomVariable).getConfiguration().default_value = null;
                                break;
                        }
                    }
                }

                // Show/hide the textarea and SecretComponent container
                updateTextareaComponentVisibility(newType);

                // Save the settings
                await plugin.saveSettings();
                
                // If "Execute with value" was selected, focus on the textarea.
                if (newType === "value") {
                    defaultValueTextareaComponent?.inputEl.focus();
                }
                
                // Extra "on change" hook.
                onChange?.();
            }),
        )
        .addTextArea(textarea => textareaComponent = textarea
            .setValue(defaultValueConfiguration ? defaultValueConfiguration.value : "")
            .onChange(async (newValue: string) => {
                if (!defaultValueConfiguration) {
                    defaultValueConfiguration = createDefaultValueConfiguration();
                }

                // Set the new text value
                defaultValueConfiguration.value = newValue;

                // Save the settings
                await plugin.saveSettings();
                
                // Extra "on change" hook.
                onChange?.();
            }).then((textareaComponent) => {
                // Autocomplete for the textarea.
                if (plugin.settings.show_autocomplete_menu) {
                    createAutocomplete(plugin, textareaComponent.inputEl, () => textareaComponent.onChanged());
                }
                
                // Store the textarea so that the dropdown component's callback function can focus the textarea if needed.
                defaultValueTextareaComponent = textareaComponent;
            }),
        )
    ;
    // addComponent exists on Setting in Obsidian 1.11.4+ (for SecretComponent); types in obsidian@1.4.0 don't declare it
    (defaultValueSetting as Setting & { addComponent: (cb: (el: HTMLElement) => void) => Setting }).addComponent((controlEl: HTMLElement) => {
            secretContainerEl = controlEl.createDiv();
            secretContainerEl.addClass("SC-secret-component-container");
            if (hasSecretStorage) {
                const SecretComponentClass = (obsidian as { SecretComponent?: new (app: App, containerEl: HTMLElement) => { setValue: (v: string) => void; onChange: (cb: (v: string) => void) => void } }).SecretComponent;
                if (SecretComponentClass && appWithSecrets.secretStorage) {
                    const currentValue = defaultValueConfiguration?.type === "from-keyring" ? (defaultValueConfiguration.value ?? "") : "";
                    const secretComp = new SecretComponentClass(plugin.app, secretContainerEl);
                    secretComp.setValue(currentValue);
                    secretComp.onChange(async (value: string) => {
                        if (!defaultValueConfiguration) {
                            defaultValueConfiguration = createDefaultValueConfiguration();
                        }
                        defaultValueConfiguration.type = "from-keyring";
                        defaultValueConfiguration.value = value;
                        await plugin.saveSettings();
                        onChange?.();
                    });
                }
            } else {
                const hint = secretContainerEl.createSpan({ cls: "SC-setting-item-description" });
                hint.setText("Requires Obsidian 1.11.4 or later for Keyring (SecretStorage) support.");
            }
        });
    const initialType = defaultValueConfiguration ? defaultValueConfiguration.type : targetType === "tShellCommand" ? "show-errors" : "inherit";
    updateTextareaComponentVisibility(initialType);

    return defaultValueSetting;
}