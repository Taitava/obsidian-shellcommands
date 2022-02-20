import SC_Plugin from "../main";
import {SC_Modal} from "../SC_Modal";
import {
    Prompt,
    PromptFieldConfiguration,
    PromptFieldSettingGroup,
} from "../imports";
import {Setting} from "obsidian";

export class DeletePromptFieldModal extends SC_Modal {
    constructor(
        plugin: SC_Plugin,
        private prompt: Prompt,
        private prompt_field_index: number,
        private prompt_field_configuration: PromptFieldConfiguration,
        private setting_group: PromptFieldSettingGroup,
        private container_element: HTMLElement
    ) {
        super(plugin);
        this.setting_group = setting_group;
        this.container_element = container_element;
    }

    public onOpen(): void {
        super.onOpen();
        this.setTitle("Delete prompt field: " + this.prompt_field_configuration.label);

        const container_element = this.modalEl;
        container_element.createEl("p", {text: "Are you sure you want to delete this field?"});
        new Setting(container_element)
            .addButton(button => button
                .setButtonText("Yes, delete")
                .onClick(async () => {
                    // Delete the field from configuration
                    this.prompt.getConfiguration().fields.splice(this.prompt_field_index, 1); // Do not use delete, as it would place null in the list.

                    // Delete setting fields
                    // TODO: Find a better way to delete all setting fields
                    this.container_element.removeChild(this.setting_group.heading_setting.settingEl);
                    this.container_element.removeChild(this.setting_group.label_setting.settingEl);
                    this.container_element.removeChild(this.setting_group.default_value_setting.settingEl);
                    this.container_element.removeChild(this.setting_group.target_variable_setting.settingEl);
                    this.container_element.removeChild(this.setting_group.required_setting.settingEl);

                    // Save and close the modal
                    await this.plugin.saveSettings();
                    this.close();
                }),
            )
        ;
    }
}