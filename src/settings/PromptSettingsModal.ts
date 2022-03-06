import {SC_Modal} from "../SC_Modal";
import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {createNewModelInstanceButton} from "../models/createNewModelInstanceButton";
import {
    getModel,
    Prompt,
    PromptField,
    PromptFieldModel,
} from "../imports";

export class PromptSettingsModal extends SC_Modal {

    constructor(
        plugin: SC_Plugin,
        private readonly prompt: Prompt,
    ) {
        super(plugin);
    }

    public onOpen(): void {
        super.onOpen();
        const container_element = this.modalEl;

        // Title
        new Setting(container_element)
            .setName("Prompt title")
            .addText(text => text
                .setValue(this.prompt.getTitle())
                .onChange(async (new_title: string) => {
                    this.prompt.getConfiguration().title = new_title;
                    await this.plugin.saveSettings();
                }),
            )

            // Focus on the text field
            .controlEl.find("input").focus()
        ;

        // Preview shell command
        new Setting(container_element)
            .setName("Preview shell command in prompt")
            .setDesc("If this is on, the prompt will display the executable shell command with variable names in it, and highlight the variable(s) that will be affected by the values inputted in the prompt.")
            .addToggle(toggle => toggle
                .setValue(this.prompt.getConfiguration().preview_shell_command)
                .onChange(async (new_value: boolean) => {
                    this.prompt.getConfiguration().preview_shell_command = new_value;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Fields
        const prompt_field_model = getModel<PromptFieldModel>(PromptFieldModel.name);
        const fields_container = container_element.createDiv();
        this.prompt.prompt_fields.forEach((prompt_field: PromptField) => {
            prompt_field_model.createSettingFields(prompt_field, fields_container);
        });

        // New field button
        createNewModelInstanceButton<PromptFieldModel, PromptField>(this.plugin, PromptFieldModel.name, container_element, fields_container, this.prompt.configuration);
    }
}