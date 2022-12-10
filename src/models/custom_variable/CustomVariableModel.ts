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

import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {CustomVariableInstance} from "./CustomVariableInstance";
import {
    getIDGenerator,
    Model,
    ParentModelOneToManyIdRelation,
} from "../../imports";
import {debugLog} from "../../Debug";
import {
    GlobalVariableDefaultValueConfiguration,
} from "../../variables/Variable";
import {createVariableDefaultValueField} from "../../settings/setting_elements/createVariableDefaultValueFields";

export class CustomVariableModel extends Model {

    private custom_variable_instances: CustomVariableInstanceMap = new CustomVariableInstanceMap;

    public getSingularName(): string {
        return "Custom variable";
    }

    protected defineParentConfigurationRelation(custom_variable_instance: CustomVariableInstance): ParentModelOneToManyIdRelation {
        debugLog(`CustomVariableModel: Defining parent configuration relation for CustomVariableInstance ${custom_variable_instance.getID()}.`);
        return {
            type: "one-to-many-id",
            key: "custom_variables",
            id: custom_variable_instance.getID(),
        };
    }

    public loadInstances(parent_configuration: SC_MainSettings): CustomVariableInstanceMap {
        debugLog(`CustomVariableModel: Loading CustomVariableInstances.`);
        this.custom_variable_instances.clear();
        parent_configuration.custom_variables.forEach((custom_variable_configuration: CustomVariableConfiguration) => {
            this.custom_variable_instances.set(
                custom_variable_configuration.id,
                new CustomVariableInstance(this, custom_variable_configuration, parent_configuration)
            );
        });
        return this.custom_variable_instances;
    }

    public newInstance(parent_configuration: SC_MainSettings): CustomVariableInstance {
        debugLog(`CustomVariableModel: Creating a new CustomVariableInstance.`);

        // Create a default configuration object
        const custom_variable_configuration: CustomVariableConfiguration = this.getDefaultConfiguration();
        parent_configuration.custom_variables.push(custom_variable_configuration);

        // Create a CustomVariableInstance for handling the configuration
        const custom_variable_instance = new CustomVariableInstance(this, custom_variable_configuration, parent_configuration);
        this.custom_variable_instances.set(custom_variable_configuration.id, custom_variable_instance);

        // Create an operational variable.
        this.plugin.getVariables().add(custom_variable_instance.createCustomVariable());

        return custom_variable_instance;
        // TODO: Move this logic to the base Model class.
    }

    protected _createSettingFields(instance: CustomVariableInstance, container_element: HTMLElement): Setting {
        debugLog(`CustomVariableModel: Creating setting fields for CustomVariableInstance ${instance.getID()}.`);

        // Make the fields appear closer together.
        container_element.addClass("SC-setting-group");

        // Heading setting
        const heading_setting = new Setting(container_element)
            .setName(instance.getFullName())
            .setHeading()
        ;

        // Name setting
        new Setting(container_element)
            .setName("Variable name")
            .setDesc("Must contain at least one character. Allowed characters are letters a-z, numbers 0-9 and an underscore _")
            .setClass("SC-custom-variable-name-setting")
            .addText(text => text
                .setValue(instance.configuration.name)
                .onChange((new_name: string) => {
                    // TODO: Find a way to create this kind of trivial onChange() functions in the Model base class.
                    instance.setIfValid("name", new_name).then(async () => {
                        // Valid
                        heading_setting.setName(instance.getFullName()) // Also removes a possible warning message.
                        instance.getCustomVariable().updateProperties(); // Update the name also to the operational variable, not only in configuration.
                        await this.plugin.saveSettings();
                        await this.plugin.updateCustomVariableViews();
                    }, (reason: string | unknown) => {
                        // Not valid
                        if (typeof reason === "string") {
                            // This is a validation error message.
                            // Display a warning message.
                            heading_setting.setName(reason + " The name was not saved.");
                        } else {
                            // Some other runtime error has occurred.
                            throw reason;
                        }
                    });
                }),
            )
        ;

        // Description setting
        new Setting(container_element)
            .setName("Description")
            .setDesc("Appears in autocomplete lists along with the variable name, and also in the 'Custom variables' pane, if you use it.")
            .addText(text => text
                .setValue(instance.configuration.description)
                .onChange(async (new_description: string) => {
                    // TODO: Find a way to create this kind of trivial onChange() functions in the Model base class.
                    instance.configuration.description = new_description;
                    instance.getCustomVariable().updateProperties(); // Update the description also to the operational variable, not only in configuration.
                    await this.plugin.saveSettings();
                    await this.plugin.updateCustomVariableViews();
                }),
            )
        ;

        // Default value setting
        createVariableDefaultValueField(
            this.plugin,
            container_element,
            "Default value",
            instance.getCustomVariable(),
        );

        return heading_setting;
    }

    public validateValue(custom_variable_instance: CustomVariableInstance, field: keyof CustomVariableInstance["configuration"], custom_variable_name: string): Promise<void> {
        debugLog(`CustomVariableModel: Validating ${field} value ${custom_variable_name} for CustomVariableInstance ${custom_variable_instance.getID()}.`);
        return new Promise<void>((resolve, reject) => {
            switch (field) {
                case "name":
                    // Check that the name contains only characters a-z, 0-9 and/or underline _
                    if (!custom_variable_name.match(/^[\w\d]+$/u)) {
                        // Incorrect format.
                        reject(`The name {{_${custom_variable_name}}} does not meet the naming requirements.`);
                        return;
                    }

                    // Check if the name is a duplicate.
                    if (this.isCustomVariableNameDuplicate(custom_variable_name, custom_variable_instance)) {
                        // It's a duplicate.
                        reject(`The name {{_${custom_variable_name}}} is already reserved.`);
                    } else {
                        // It's unique.
                        resolve();
                    }
                    return;
                default:
                    // Other fields do not need validation.
                    resolve();
                    return;
            }
        });
    }

    public getDefaultConfiguration(): CustomVariableConfiguration {
        // Generate a unique name for the variable by using a sequential number.
        let sequential_number = 1;
        while (this.isCustomVariableNameDuplicate(String(sequential_number))) {
            sequential_number++;
        }

        // Create a configuration object.
        return {
            id: getIDGenerator().generateID(),
            name: String(sequential_number),
            description: "",
            default_value: undefined,
        };
    }

    protected async _deleteInstance(custom_variable_instance: CustomVariableInstance): Promise<void> {
        debugLog(`CustomVariableModel: Deleting CustomVariableInstance ${custom_variable_instance.getID()}.`);

        // Remove the CustomVariableInstance from all PromptFields that use it.
        for (const prompt of this.plugin.getPrompts().values()) {
            for (const prompt_field of prompt.prompt_fields) {
                if (custom_variable_instance.getID() === prompt_field.configuration.target_variable_id) {
                    // This prompt field uses this CustomVariableInstance.
                    // Remove the variable from use.
                    prompt_field.configuration.target_variable_id = "";
                    // Saving is done later, after the _deleteInstance() call.
                }
            }
        }

        // Delete CustomVariable
        try {
            this.plugin.getVariables().delete(custom_variable_instance.getCustomVariable());
        } catch (error) {
            // If custom_variable_instance.getCustomVariable() failed, no need to do anything. It just means there is no CustomVariable, so there's nothing to delete.
        }

        // Delete CustomVariableInstance
        this.custom_variable_instances.delete(custom_variable_instance.getID());

        // remove the variable from custom variable side panes.
        await this.plugin.updateCustomVariableViews();
    }

    /**
     * Can be changed to public if needed.
     */
    private isCustomVariableNameDuplicate(custom_variable_name: string, ignore_custom_variable_instance?: CustomVariableInstance): boolean {
        let is_duplicate = false;
        this.custom_variable_instances.forEach((custom_variable2_instance: CustomVariableInstance, custom_variable_id: string) => {
            // First check can the current custom variable attend to the duplicate test.
            if (ignore_custom_variable_instance && custom_variable_id === ignore_custom_variable_instance.getID()) {
                // Don't check this instance. This skipping is used for the current owner of the name.
                return;
            }

            // Now do the actual duplicate test.
            if (custom_variable_name.toLocaleLowerCase() === custom_variable2_instance.configuration.name.toLocaleLowerCase()) {
                is_duplicate = true;
            }
        });
        return is_duplicate;
    }
}

export interface CustomVariableConfiguration {
    id: string,
    name: string,
    description: string,
    default_value: GlobalVariableDefaultValueConfiguration | undefined,
}

export class CustomVariableInstanceMap extends Map<string, CustomVariableInstance> {}