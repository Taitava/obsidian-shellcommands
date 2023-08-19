/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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
    SliderComponent,
    TextComponent,
} from "obsidian";
import {randomInteger} from "../../../Common";
import {createAutocomplete} from "../../../settings/setting_elements/Autocomplete";
import {
    CustomVariableInstance,
    CustomVariableModel,
    CustomVariableSettingsModal,
    getModel,
    Model,
    ParentModelOneToManyIndexRelation,
    Prompt,
    PromptField,
    PromptFieldConfiguration,
    PromptFieldType,
    PromptFieldTypes,
} from "../../../imports";

export class PromptFieldModel extends Model {

    public static getSingularName(): string {
        return "Prompt field";
    }

    protected defineParentConfigurationRelation(prompt_field: PromptField): ParentModelOneToManyIndexRelation {
        return {
            type: "one-to-many-index",
            key: "fields",
            index: prompt_field.prompt_field_index as number,
        };
    }

    public loadInstances(prompt: Prompt): PromptFieldSet {
        const prompt_fields = new PromptFieldSet;
        prompt.configuration.fields.forEach((field_configuration: PromptFieldConfiguration, index) => {
            prompt_fields.add(
                this.createInstance(prompt, field_configuration, index)
            );
        });
        return prompt_fields;
    }

    public newInstance(prompt: Prompt): PromptField {
        // TODO: Move this logic to the base Model class.

        // Setup a default configuration
        const prompt_field_configuration = this.getDefaultConfiguration();

        // Instantiate a PromptField
        const prompt_field = this.createInstance(prompt, prompt_field_configuration, prompt.configuration.fields.length);

        // Store the configuration into the prompt's configuration
        prompt.configuration.fields.push(prompt_field_configuration);

        // Store the PromptField instance into its parent Prompt's list of fields.
        prompt.prompt_fields.add(prompt_field);

        // Return the PromptField
        return prompt_field;
    }

    private createInstance(prompt: Prompt, prompt_field_configuration: PromptFieldConfiguration, prompt_field_index: number): PromptField {
        // TODO: When the 'type' field gets implemented on PromptFieldConfiguration, implement some kind of switch structure here to create different types of PromptFields.
        return new PromptField(this, prompt, prompt_field_configuration, prompt_field_index);
    }

    protected _createSettingFields(prompt_field: PromptField, container_element: HTMLElement): Setting {
        const label_placeholders = [
            "What is your name?",
            "How big is the universe?",
            "How long is eternity?",
            "What is your lucky number?",
            "What is your favorite song?",
            "What is your favorite color?",
            "How many books have you read?",
            "What is the purpose of life?",
        ];
        const default_value_placeholders = [
            ["Bond, James Bond", "John Doe", "Jane Doe", "Mr. Bean"],
            ["Very big, and still expanding", "93 billion light-years"],
            ["Infinite", "Too long to wait for"],
            [String(randomInteger(0, 9)), "I don't have one"],
            ["We are the world (USA for Africa)", "Heal the world (Michael Jackson)", "Imagine (John Lennon)", "Circle of life (Elton John)"],
            ["Blue as deep as an ocean", "Red as love", "Grass-green", "Snow-white"],
            ["Thousands", "Many", "Countless", "None"],
            ["Thinking", "Being a being", "42"],
        ];
        const label_placeholder_index: number = randomInteger(0, label_placeholders.length - 1);
        const default_value_placeholders_subset: string[] = default_value_placeholders[label_placeholder_index];

        // Create a list of custom variables
        const custom_variable_options: {[key: string]: string} = {};
        this.plugin.getCustomVariableInstances().forEach((custom_variable_instance: CustomVariableInstance, custom_variable_id: string) => {
            custom_variable_options[custom_variable_id] = custom_variable_instance.getFullName();
        });

        const on_default_value_setting_change = async (new_default_value: string) => {
            prompt_field.configuration.default_value = new_default_value;
            await this.plugin.saveSettings();
        };

        // Create the setting fields
        const setting_group_element = container_element.createDiv({attr: {class: "SC-setting-group"}});
        let label_setting_component: TextComponent;
        let description_setting_component: TextComponent;
        const setting_group: PromptFieldSettingGroup = {
            heading_setting: new Setting(setting_group_element)
                .setName("") // This will be set down below.
                .setHeading()
                .addDropdown(dropdownComponent => dropdownComponent
                    .addOptions(PromptFieldTypes)
                    .setValue(prompt_field.configuration.type)
                    .onChange(async (newType: keyof typeof PromptFieldTypes) => {
                        // Change the PromptField's type.
                        prompt_field.configuration.type = newType;
                        
                        // Declare possibly new configuration properties.
                        prompt_field.ensureAllConfigurationPropertiesExist();
                        
                        // Create possible new setting fields.
                        this.createTypeSpecificSettingFields(prompt_field, typeSpecificSettingFieldsContainer);
                        await this.plugin.saveSettings();
                    })
                )
            ,
            label_setting: new Setting(setting_group_element)
                .setName("Field label")
                .addText(text => label_setting_component = text
                    .setValue(prompt_field.configuration.label)
                    .setPlaceholder(label_placeholders[label_placeholder_index])
                    .onChange(async (new_label: string) => {
                        prompt_field.configuration.label = new_label;
                        _update_heading();
                        await this.plugin.saveSettings();
                    })
                )
            ,
            default_value_setting: new Setting(setting_group_element)
                .setName("Default value")
                .addText(text => text
                    .setValue(prompt_field.configuration.default_value)
                    .setPlaceholder(
                        prompt_field.configuration.label ? "" // If the label is defined, do not add a placeholder here, as the label's placeholder is not visible, so this placeholder would not make sense.
                            : default_value_placeholders_subset[randomInteger(0, default_value_placeholders_subset.length - 1)]
                    )
                    .onChange(on_default_value_setting_change)
                )
            ,
            description_setting: new Setting(setting_group_element)
                .setName("Description")
                .addText(text => description_setting_component = text
                    .setValue(prompt_field.configuration.description)
                    .onChange(async (new_description: string) => {
                        prompt_field.configuration.description = new_description;
                        await this.plugin.saveSettings();
                    }),
                )
            ,
            target_variable_setting: new Setting(setting_group_element)
                .setName("Target variable")
                .setDesc("Where the inputted value will be stored in. You can use the variable in a shell command.")
                .addDropdown(dropdown => dropdown
                    .addOption("", "") // An option for a situation when nothing is selected.
                    .addOptions(custom_variable_options)
                    .addOption("new", "Create a new custom variable")
                    .setValue(prompt_field.configuration.target_variable_id)
                    .onChange((new_target_variable_id: string) => {
                        if ("new" === new_target_variable_id) {
                            // Create a new custom variable.
                            const model = getModel<CustomVariableModel>(CustomVariableModel.name);
                            const custom_variable_instance = model.newInstance(this.plugin.settings);
                            this.plugin.saveSettings().then(() => {
                                const modal = new CustomVariableSettingsModal(
                                    this.plugin,
                                    custom_variable_instance,
                                    async () => {
                                        // Variable is created.
                                        dropdown.addOption(custom_variable_instance.getID(), custom_variable_instance.getTitle());
                                        dropdown.setValue(custom_variable_instance.getID());
                                        prompt_field.configuration.target_variable_id = custom_variable_instance.getID();
                                        await this.plugin.saveSettings();
                                    },
                                    async () => {
                                        dropdown.setValue(prompt_field.configuration.target_variable_id); // Reset the dropdown selection.
                                        // Variable creation was cancelled.
                                        model.deleteInstance(custom_variable_instance);
                                        await this.plugin.saveSettings();
                                    },
                                );
                                modal.open();
                            });
                        } else {
                            // Use an existing target variable (or an empty id "").
                            // Check that this target variable is not reserved.
                            prompt_field.setIfValid("target_variable_id", new_target_variable_id).then(async () => {
                                // It can be used.
                                await this.plugin.saveSettings();
                            }, (error_message: string | unknown) => {
                                if (typeof error_message === "string") {
                                    // This is a validation error message.
                                    // The target variable is reserved.
                                    dropdown.setValue(prompt_field.configuration.target_variable_id); // Reset the dropdown selection.
                                    this.plugin.newNotification(error_message);
                                } else {
                                    // Some other runtime error has occurred.
                                    throw error_message;
                                }
                            });
                        }
                    })
                )
            ,
            required_setting: new Setting(setting_group_element)
                .setName("Is required")
                .setDesc("If on, the field needs to be filled before the prompt can be submitted.")
                .addToggle(toggle => toggle
                    .setValue(prompt_field.configuration.required)
                    .onChange(async (new_required: boolean) => {
                        prompt_field.configuration.required = new_required;
                        await this.plugin.saveSettings();
                    })
                )
            ,
        };
        _update_heading();

        function _update_heading() {
            setting_group.heading_setting.setName(prompt_field.getTitle());
        }

        // Autocomplete menu
        if (this.plugin.settings.show_autocomplete_menu) {
            // Show autocomplete menu (= a list of available variables).
            const label_input_element = setting_group.label_setting.controlEl.find("input") as HTMLInputElement;
            createAutocomplete(this.plugin, label_input_element, () => label_setting_component.onChanged());
            const default_value_input_element = setting_group.default_value_setting.controlEl.find("input") as HTMLInputElement;
            createAutocomplete(this.plugin, default_value_input_element, on_default_value_setting_change);
            const description_input_element = setting_group.description_setting.controlEl.find("input") as HTMLInputElement;
            createAutocomplete(this.plugin, description_input_element, () => description_setting_component.onChanged());
        }
        
        const typeSpecificSettingFieldsContainer = setting_group_element.createDiv();
        this.createTypeSpecificSettingFields(prompt_field, typeSpecificSettingFieldsContainer);

        return setting_group.heading_setting;
    }
    
    private createTypeSpecificSettingFields(promptField: PromptField, containerElement: HTMLElement) {
        // Remove possibly existing setting fields, in case this method is recalled.
        containerElement.innerHTML = "";
        
        const promptFieldConfiguration = promptField.configuration;
        switch (promptFieldConfiguration.type) {
            case "multi-line-text":
                // Visible text rows
                new Setting(containerElement)
                    .setName("Rows")
                    .setDesc("Number of visible text lines. User can still enter more lines.")
                    .addSlider((sliderComponent: SliderComponent) => sliderComponent
                        .setLimits(2, 50, 1)
                        .setValue(promptFieldConfiguration.rows)
                        .onChange(async (rows: number) => {
                            promptFieldConfiguration.rows = rows;
                            await this.plugin.saveSettings();
                        })
                        .setDynamicTooltip(), // Show the number when hovering.
                    )
                ;
                break;
            
            case "toggle":
                // Toggled on result.
                new Setting(containerElement)
                    .setName("Result when toggled on")
                    .setDesc("What value the target variable will have if the toggle is checked. The toggle is checked by default, if the Default value (defined above) matches this value. The match is not case-sensitive.")
                    .addText(textComponent => textComponent
                        .setValue(promptFieldConfiguration.on_result)
                        .onChange(async (onResult: string) => {
                            promptFieldConfiguration.on_result = onResult;
                            await this.plugin.saveSettings();
                        })
                        .then((textComponent) =>
                            createAutocomplete(this.plugin, textComponent.inputEl, () => textComponent.onChanged())
                        )
                    )
                ;
                
                // Toggled off result.
                new Setting(containerElement)
                    .setName("Result when toggled off")
                    .setDesc("What value the target variable will have if the toggle is not checked. {{variables}} can be used both here and above.")
                    .addText(textComponent => textComponent
                        .setValue(promptFieldConfiguration.off_result)
                        .onChange(async (offResult: string) => {
                            promptFieldConfiguration.off_result = offResult;
                            await this.plugin.saveSettings();
                        })
                        .then((textComponent) =>
                            createAutocomplete(this.plugin, textComponent.inputEl, () => textComponent.onChanged())
                        )
                    )
                ;
                break;
                
            default:
                // This field type does not need extra setting fields.
        }
    }

    public validateValue(prompt_field: PromptField, field: keyof PromptFieldConfiguration, value: unknown): Promise<void> {
        switch (field) {
            case "target_variable_id": {
                const new_target_variable_id: string = value as string; // A more descriptive name for 'value'.

                // Always allow an empty target_variable_id. A Prompt cannot be opened if a field lacks a target_variable_id, but it's allowed to be stored in the configuration, because new Prompts cannot have a default selected target variable.
                if ("" === new_target_variable_id) {
                    return Promise.resolve();
                }

                // Check that the target variable is not used by other fields of the same Prompt.
                for (const other_prompt_field of prompt_field.prompt.prompt_fields) {
                    if (prompt_field !== other_prompt_field) { // Do not check the same field. Only check other fields.
                        // Check if this other field has the same target variable.
                        if (new_target_variable_id === other_prompt_field.configuration.target_variable_id) {
                            // They have the same target_variable_id.
                            // Return an error message.
                            const targetVariableInstance: CustomVariableInstance | undefined = this.plugin.getCustomVariableInstances().get(new_target_variable_id);
                            if (undefined === targetVariableInstance) {
                                throw new Error("Could not find target variable with id " + new_target_variable_id);
                            }
                            const target_variable_name = targetVariableInstance.getFullName();
                            return Promise.reject(`Target variable ${target_variable_name} is already used by another field in the same prompt. Select another variable.`);
                        }
                    }
                }
                // All fields have been checked and no collisions were found.
                return Promise.resolve();
            } default: {
                // No validation for other fields.
                throw new Error(this.constructor.name + ".validateValue(): No validation is implemented for other fields.");
            }
        }
    }

    public getDefaultConfiguration(fieldType: PromptFieldType = "single-line-text"): PromptFieldConfiguration {
        const commonProperties = {
            label: "",
            description: "",
            default_value: "",
            target_variable_id: "",
            required: true,
        };
        switch (fieldType) {
            case "single-line-text":
                return {
                    type: fieldType,
                    ...commonProperties,
                    // TODO: Implement placeholder property later.
                };
            case "multi-line-text":
                return {
                    type: fieldType,
                    ...commonProperties,
                    // TODO: Implement placeholder property later.
                    rows: 10,
                };
            case "toggle":
                return {
                    type: fieldType,
                    ...commonProperties,
                    on_result: "ON",
                    off_result: "OFF",
                };
        }
    }

    protected _deleteInstance(prompt_field: PromptField): void {
        prompt_field.prompt.prompt_fields.delete(prompt_field);
    }
}

export class PromptFieldSet extends Set<PromptField> {}

export interface PromptFieldSettingGroup {
    heading_setting: Setting;
    label_setting: Setting;
    default_value_setting: Setting;
    description_setting: Setting;
    target_variable_setting: Setting
    required_setting: Setting;
}