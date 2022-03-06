import {
    DeletePromptFieldModal,
    Prompt,
    PromptFieldConfiguration,
} from "../../imports";
import {Setting} from "obsidian";
import SC_Plugin from "../../main";

export function createPromptFieldSettingField(plugin: SC_Plugin, container_element: HTMLElement, prompt: Prompt, prompt_field_index: number, prompt_field_configuration: PromptFieldConfiguration) {
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
        "Bond, James Bond",
        "Very big, and still expanding",
        "Infinite",
        String(Math.floor(Math.random() * 10)),
        "USA for Africa: We are the world",
        "A blue deeper than ocean",
        "Thousands",
        "Thinking",
    ];
    const label_placeholder_index: number = Math.floor(Math.random() * label_placeholders.length);
    const setting_group: PromptFieldSettingGroup = {
        heading_setting: new Setting(container_element)
            .setName("") // This will be set down below.
            .setHeading()
            .addExtraButton(button => button
                .setIcon("trash")
                .setTooltip("Delete this field.")
                .onClick(() => {
                    // Trash icon is clicked
                    const modal = new DeletePromptFieldModal(plugin, prompt, prompt_field_index, prompt_field_configuration, setting_group, container_element)
                    modal.open();
                }),
            )
        ,
        label_setting: new Setting(container_element)
            .setName("Field label")
            .setDesc("Displayed in the prompt.")
            .addText(text => text
                .setValue(prompt_field_configuration.label)
                .setPlaceholder(label_placeholders[label_placeholder_index])
                .onChange(async (new_label: string) => {
                    prompt_field_configuration.label = new_label;
                    _update_heading()
                    await plugin.saveSettings();
                })
            )
        ,
        default_value_setting: new Setting(container_element)
            .setName("Default value")
            .setDesc("Can be static text, {{variables}} or a combination of both.")
            .addText(text => text
                .setValue(prompt_field_configuration.default_value)
                .setPlaceholder(default_value_placeholders[label_placeholder_index])
                .onChange(async (new_default_value: string) => {
                    prompt_field_configuration.default_value = new_default_value;
                    await plugin.saveSettings();
                })
            )
        ,
        target_variable_setting: new Setting(container_element)
            .setName("Target variable")
            .setDesc("A custom variable that you can use in a shell command to read the input value.")
            .addDropdown(dropdown => dropdown
                .setValue(prompt_field_configuration.target_variable)
                .addOption("", "") // An option for a situation when nothing is selected.
                // .addOptions() TODO: Add a list of custom variables when custom variables are implemented.
                .addOption("new", "Create a new custom variable")
                .onChange(async (new_target_variable: string) => {
                    prompt_field_configuration.target_variable = new_target_variable;
                    await plugin.saveSettings();
                })
            )
        ,
        required_setting: new Setting(container_element)
            .setName("Is required")
            .setDesc("If on, the field needs to be filled before the prompt can be submitted.")
            .addToggle(toggle => toggle
                .setValue(prompt_field_configuration.required)
                .onChange(async (new_required: boolean) => {
                    prompt_field_configuration.required = new_required;
                    await plugin.saveSettings();
                })
            )
        ,
    };
    _update_heading();

    function _update_heading() {
        setting_group.heading_setting.setName(prompt_field_configuration.label === "" ? "Unlabeled field" : prompt_field_configuration.label);
    }
}

export interface PromptFieldSettingGroup {
    heading_setting: Setting;
    label_setting: Setting;
    default_value_setting: Setting;
    target_variable_setting: Setting
    required_setting: Setting;
}