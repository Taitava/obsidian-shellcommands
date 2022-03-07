import {Setting} from "obsidian";
import {randomInteger} from "../../../Common";
import {
    Model,
    ParentModelOneToManyRelation,
    Prompt,
    PromptField,
    PromptField_Text,
    PromptFieldConfiguration,
} from "../../../imports";

export class PromptFieldModel extends Model {

    public getSingularName(): string {
        return "Field";
    }

    protected defineParentConfigurationRelation(prompt_field: PromptField): ParentModelOneToManyRelation {
        return {
            type: "one-to-many",
            key: "fields",
            index: prompt_field.prompt_field_index as number,
        };
    }

    public createInstances(prompt: Prompt): PromptFieldSet {
        const prompt_fields = new PromptFieldSet;
        let index = 0;
        prompt.configuration.fields.forEach((field_configuration: PromptFieldConfiguration) => {
            prompt_fields.add(
                // TODO: When the 'type' field gets implemented on PromptFieldConfiguration, implement some kind of switch structure here to create different types of PromptFields.
                new PromptField_Text(this, prompt, field_configuration, index), // TODO: Extract this to a separate method.
            );
        });
        return prompt_fields;
    }

    public newInstance(prompt: Prompt): PromptField {
        // TODO: Move this logic to the base Model class.

        // Setup a default configuration
        const prompt_field_configuration = this._getDefaultConfiguration();

        // Instantiate a PromptField
        // TODO: When implementing 'type', add different types here, e.g. PromptField_Integer in addition to PromptField_Text.
        const prompt_field = new PromptField_Text(this, prompt, prompt_field_configuration, prompt.configuration.fields.length); // TODO: Extract this to a separate method.

        // Store the configuration into the prompt's configuration
        prompt.configuration.fields.push(prompt_field_configuration);

        // Return the PromptField
        return prompt_field;
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
            ["We are the world (USA for Africa)", "Heal the world (Michael Jackson)", "Imagine (John Lennon)"],
            ["Blue as deep as an ocean", "Red as love", "Grass-green", "Snow-white"],
            ["Thousands", "Many", "Countless", "None"],
            ["Thinking", "Being a being", "42"],
        ];
        const label_placeholder_index: number = randomInteger(0, label_placeholders.length - 1);
        const default_value_placeholders_subset: string[] = default_value_placeholders[label_placeholder_index];
        const setting_group: PromptFieldSettingGroup = {
            heading_setting: new Setting(container_element)
                .setName("") // This will be set down below.
                .setHeading()
            ,
            label_setting: new Setting(container_element)
                .setName("Field label")
                .setDesc("Displayed in the prompt.")
                .addText(text => text
                    .setValue(prompt_field.configuration.label)
                    .setPlaceholder(label_placeholders[label_placeholder_index])
                    .onChange(async (new_label: string) => {
                        prompt_field.configuration.label = new_label;
                        _update_heading()
                        await this.plugin.saveSettings();
                    })
                )
            ,
            default_value_setting: new Setting(container_element)
                .setName("Default value")
                .setDesc("Can be static text, {{variables}} or a combination of both.")
                .addText(text => text
                    .setValue(prompt_field.configuration.default_value)
                    .setPlaceholder(
                        prompt_field.configuration.label ? "" // If the label is defined, do not add a placeholder here, as the label's placeholder is not visible, so this placeholder would not make sense.
                            : default_value_placeholders_subset[randomInteger(0, default_value_placeholders_subset.length - 1)]
                    )
                    .onChange(async (new_default_value: string) => {
                        prompt_field.configuration.default_value = new_default_value;
                        await this.plugin.saveSettings();
                    })
                )
            ,
            target_variable_setting: new Setting(container_element)
                .setName("Target variable")
                .setDesc("A custom variable that you can use in a shell command to read the input value.")
                .addDropdown(dropdown => dropdown
                    .setValue(prompt_field.configuration.target_variable)
                    .addOption("", "") // An option for a situation when nothing is selected.
                    // .addOptions() TODO: Add a list of custom variables when custom variables are implemented.
                    .addOption("new", "Create a new custom variable")
                    .onChange(async (new_target_variable: string) => {
                        prompt_field.configuration.target_variable = new_target_variable;
                        await this.plugin.saveSettings();
                    })
                )
            ,
            required_setting: new Setting(container_element)
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

        return setting_group.heading_setting;
    }

    private _getDefaultConfiguration(): PromptFieldConfiguration {
        return {
            // type: "text",
            label: "",
            // TODO: Add 'description'
            default_value: "",
            //  TODO: Add 'placeholder'.
            target_variable: "",
            required: true,
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
    target_variable_setting: Setting
    required_setting: Setting;
}