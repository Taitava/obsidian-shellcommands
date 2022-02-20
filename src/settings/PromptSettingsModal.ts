import {SC_Modal} from "../SC_Modal";
import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {
    createPromptFieldSettingField,
    getDefaultPrompFieldConfiguration,
    Prompt,
    PromptFieldConfiguration,
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
        const fields_container = container_element.createDiv();
        this.prompt.getConfiguration().fields.forEach((prompt_field_configuration: PromptFieldConfiguration, prompt_field_index: number) => {
            createPromptFieldSettingField(this.plugin, fields_container, this.prompt, prompt_field_index, prompt_field_configuration);
        });

        // New field button
        new Setting(container_element)
            .addButton(button => button
                .setButtonText("New field")
                .onClick(async () => {
                    // Create a new prompt field
                    const prompt_field_configuration = getDefaultPrompFieldConfiguration();
                    this.prompt.getConfiguration().fields.push(prompt_field_configuration);
                    await this.plugin.saveSettings();
                    const prompt_field_index = this.prompt.getConfiguration().fields.length - 1;
                    createPromptFieldSettingField(this.plugin, fields_container, this.prompt, prompt_field_index, prompt_field_configuration);
                }),
            )
        ;
    }
}