import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import SC_Plugin from "../../main";
import {
    Model,
    ParentModelOneToManyRelation,
} from "../../imports";

export class CustomVariableInstance extends Model<CustomVariableConfiguration, SC_MainSettings> {
    protected readonly model_singular_name = "Custom variable";

    public readonly parent_configuration: SC_MainSettings;
    public configuration: CustomVariableConfiguration;

    constructor(
        plugin: SC_Plugin,
        configuration: CustomVariableConfiguration,
        private custom_variable_index: keyof SC_MainSettings["custom_variables"], // TODO: 'keyof' is kind of incorrect here, 'keyof' is for objects, but 'SC_MainSettings["custom_variables"]' is an array with numeric indexes.
    ) {
        super(plugin, configuration, plugin.settings);
    }

    protected defineParentConfigurationRelation(): ParentModelOneToManyRelation<SC_MainSettings> {
        return {
            type: "one-to-many",
            key: "custom_variables",
            index: this.custom_variable_index as number, // TODO: Find a way to avoid using 'as number'.
        };
    }


    protected _createSettingFields(container_element: HTMLElement): Setting {
        return new Setting(container_element)
            .setName("Variable name")
            .setDesc("Must begin with {{_ and end with }} and contain at least one character inside. Allowed characters are letters a-z, numbers 0-9 and an underscore _")
            .addText(text => text
                .setValue(this.configuration.name)
                .onChange(async (new_name: string) => {
                    // TODO: Find a way to create this kind of trivial onChange() functions in the Model base class.
                    this.configuration.name = new_name;
                    await this.plugin.saveSettings();
                }),
            );
    }

    protected _getDefaultConfiguration(): CustomVariableConfiguration {
        return {
            name: "{{_}}",
        }
    }
}

export interface CustomVariableConfiguration {
    name: string,
}

