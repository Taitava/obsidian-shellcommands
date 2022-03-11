import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {CustomVariableInstance} from "./CustomVariableInstance";
import {
    IDGenerator,
    Model,
    ParentModelOneToManyIdRelation,
} from "../../imports";

export class CustomVariableModel extends Model {

    private custom_variable_instances: CustomVariableInstanceMap;

    public getSingularName(): string {
        return "Custom variable";
    }

    public readonly id_generator = new IDGenerator();

    protected defineParentConfigurationRelation(custom_variable_instance: CustomVariableInstance): ParentModelOneToManyIdRelation {
        return {
            type: "one-to-many-id",
            key: "custom_variables",
            id: custom_variable_instance.getID(),
        };
    }

    public loadInstances(parent_configuration: SC_MainSettings): CustomVariableInstanceMap {
        this.custom_variable_instances = new CustomVariableInstanceMap;
        parent_configuration.custom_variables.forEach((custom_variable_configuration: CustomVariableConfiguration) => {
            this.custom_variable_instances.set(
                custom_variable_configuration.id,
                new CustomVariableInstance(this, custom_variable_configuration, parent_configuration)
            );
        });
        return this.custom_variable_instances;
    }

    public newInstance(parent_configuration: SC_MainSettings): CustomVariableInstance {
        const custom_variable_configuration: CustomVariableConfiguration = this._getDefaultConfiguration();
        const custom_variable_instance = new CustomVariableInstance(this, custom_variable_configuration, parent_configuration);
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

                    // Check if the name is a duplicate.
                    if (this.isCustomVariableNameDuplicate(custom_variable_name, custom_variable_instance)) {
                        // It's a duplicate.
                        reject(`Name ${custom_variable_name} is already reserved.`);
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

    protected _getDefaultConfiguration(): CustomVariableConfiguration {
        // Generate a unique name for the variable by using a sequential number.
        let sequential_number = 1;
        while (this.isCustomVariableNameDuplicate(`{{_${sequential_number}}}`)) {
            sequential_number++;
        }

        // Create a configuration object.
        return {
            id: this.id_generator.generateID(),
            name: `{{_${sequential_number}}}`,
        };
    }

    protected _deleteInstance(custom_variable_instance: CustomVariableInstance): void {
        this.custom_variable_instances.delete(custom_variable_instance.getID());
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
}

export class CustomVariableInstanceMap extends Map<string, CustomVariableInstance> {}