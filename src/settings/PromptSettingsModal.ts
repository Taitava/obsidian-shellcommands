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

    private ok_button_clicked = false;

    constructor(
        plugin: SC_Plugin,
        private readonly prompt: Prompt,

        /** Can be undefined if the modal is created from a place where there is no name element. */
        private readonly prompt_name_setting?: Setting,

        /** If defined, a button will be added and on_after_ok() / on_after_cancelling() will be called depending on whether the button was clicked or not. */
        private readonly ok_button_text?: string,
        private readonly on_after_ok?: () => void,
        private readonly on_after_cancelling?: () => void,
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

                    // Update the title in a name setting. (Only if the modal was created from a place where a Prompt name element exists).
                    this.prompt_name_setting?.setName(new_title);
                }),
            )

            // Focus on the text field
            .controlEl.find("input").focus()
        ;

        // Description
        new Setting(container_element)
            .setName("Description")
            .setDesc("Displayed between the prompt title and fields.")
            .addTextArea(textarea => textarea
                .setValue(this.prompt.configuration.description)
                .onChange(async (new_description: string) => {
                    this.prompt.getConfiguration().description = new_description;
                    await this.plugin.saveSettings();
                }),
            )
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
        createNewModelInstanceButton<PromptFieldModel, PromptField>(this.plugin, PromptFieldModel.name, container_element, fields_container, this.prompt);

        // Execute button text
        new Setting(container_element)
            .setName("Execute button text")
            .addText(text => text
                .setValue(this.prompt.configuration.execute_button_text)
                .onChange(async (new_execute_button_text) => {
                    this.prompt.configuration.execute_button_text = new_execute_button_text;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Ok button
        if (this.ok_button_text) {
            new Setting(container_element)
                .addButton(button => button
                    .setButtonText(this.ok_button_text)
                    .onClick(() => {
                        this.ok_button_clicked = true;
                        this.on_after_ok();
                        this.close();
                    }),
                )
            ;
        }
    }

    public onClose(): void {
        super.onClose();

        // Call a cancelling hook if one is defined (and if the closing happens due to cancelling, i.e. the ok button is NOT clicked).
        if (!this.ok_button_clicked && this.on_after_cancelling) {
            this.on_after_cancelling();
        }
    }
}