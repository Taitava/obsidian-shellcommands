import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {CustomVariableInstance} from "./CustomVariableInstance";
import {
    IDGenerator,
    Model,
    ParentModelOneToManyRelation,
} from "../../imports";

export class CustomVariableModel extends Model {

    private custom_variable_instances: CustomVariableInstanceMap;

    public getSingularName(): string {
        return "Custom variable";
    }

    public readonly id_generator = new IDGenerator();

    protected defineParentConfigurationRelation(instance: CustomVariableInstance): ParentModelOneToManyRelation {
        return {
            type: "one-to-many",
            key: "custom_variables",
            index: instance.custom_variable_index as number, // TODO: Find a way to avoid using 'as number'.
        };
    }

    public loadInstances(parent_configuration: SC_MainSettings): CustomVariableInstanceMap {
        this.custom_variable_instances = new CustomVariableInstanceMap;
        parent_configuration.custom_variables.forEach((custom_variable_configuration: CustomVariableConfiguration, custom_variable_index: number) => {
            this.custom_variable_instances.set(
                custom_variable_configuration.id,
                new CustomVariableInstance(this, custom_variable_configuration, parent_configuration, custom_variable_index)
            );
        });
        return this.custom_variable_instances;
    }

    public newInstance(parent_configuration: SC_MainSettings): CustomVariableInstance {
        const custom_variable_configuration: CustomVariableConfiguration = this._getDefaultConfiguration();
        const custom_variable_instance = new CustomVariableInstance(this, custom_variable_configuration, parent_configuration, parent_configuration.custom_variables.length);
        parent_configuration.custom_variables.push(custom_variable_configuration);
        this.custom_variable_instances.set(custom_variable_configuration.id, custom_variable_instance);
        return custom_variable_instance;
        // TODO: Move this logic to the base Model class.
    }

    protected _createSettingFields(instance: CustomVariableInstance, container_element: HTMLElement): Setting {
        const warning_setting = new Setting(container_element).setHeading();
        return new Setting(container_element)
            .setName("Variable name")
            .setDesc("Must begin with {{_ and end with }} and contain at least one character inside. Allowed characters are letters a-z, numbers 0-9 and an underscore _")
            .addText(text => text
                .setValue(instance.configuration.name)
                .onChange((new_name: string) => {
                    // TODO: Find a way to create this kind of trivial onChange() functions in the Model base class.
                    // TODO: If another custom variable has the same name, display a warning in the field's description and do not save. Mention that saving is disabled. Create a validator method for this.
                    // TODO: If the name does not begin with {{_ and end with }} , display a warning in the field's description and do not save. Mention that saving is disabled. Create a validator method for this.
                    instance.setIfValid("name", new_name).then(async () => {
                        // Valid
                        warning_setting.setName(""); // Removes a possible warning message.
                        await this.plugin.saveSettings();
                    }, (reason: string) => {
                        // Not valid
                        // Display a warning message.
                        warning_setting.setName(reason + " The name was not saved.");
                    });
                }),
            )
        ;
    }

    public validateValue(custom_variable_instance: CustomVariableInstance, field: keyof CustomVariableInstance["configuration"], custom_variable_name: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            switch (field) {
                case "name":
                    // Check that the name is wrapped in {{_ and }}, and the inner part contains only characters a-z, 0-9 and/or underline _
                    if (!custom_variable_name.match(/^\{\{_[\w\d]+\}\}$/u)) {
                        // Incorrect format.
                        reject(`Name ${custom_variable_name} does not meet the naming requirements.`);
                        return;
                    }

                    // Make sure the name is unique.
                    // TODO: Extract this to a new method when implementing sequential numbering in _getDefaultConfiguration().
                    let is_duplicate = false;
                    this.custom_variable_instances.forEach((custom_variable2_instance: CustomVariableInstance, custom_variable2_id: string) => {
                        // Don't check the current instance.
                        if (custom_variable2_id !== custom_variable_instance.getID()) {
                            // Check if the name is a duplicate
                            if (custom_variable_name.toLocaleLowerCase() === custom_variable2_instance.configuration.name.toLocaleLowerCase()) {
                                is_duplicate = true;
                            }
                        }
                    });

                    // Check if it's a duplicate.
                    if (is_duplicate) {
                        reject(`Name ${custom_variable_name} is already reserved.`);
                    } else {
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

    protected _getDefaultConfiguration(): CustomVariableConfiguration {
        return {
            id: this.id_generator.generateID(),
            name: "{{_1}}", // TODO: If the name {{_}} is already in use, increase the sequential number, e.g. {{_2}}, {{_3}} etc.
        }
    }

    protected _deleteInstance(custom_variable_instance: CustomVariableInstance): void {
        this.custom_variable_instances.delete(custom_variable_instance.getID());
    }
}

export interface CustomVariableConfiguration {
    id: string,
    name: string,
}

export class CustomVariableInstanceMap extends Map<string, CustomVariableInstance> {}