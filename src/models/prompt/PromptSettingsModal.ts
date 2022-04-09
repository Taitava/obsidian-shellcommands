import {SC_Modal} from "../../SC_Modal";
import SC_Plugin from "../../main";
import {
    Setting,
    TextAreaComponent,
    TextComponent,
} from "obsidian";
import {createNewModelInstanceButton} from "../createNewModelInstanceButton";
import {
    getModel,
    Prompt,
    PromptField,
    PromptFieldModel,
} from "../../imports";
import {createAutocomplete} from "../../settings/setting_elements/Autocomplete";
import {getVariableAutocompleteItems} from "../../variables/getVariableAutocompleteItems";

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
        const title_and_description_group_element = container_element.createDiv({attr: {class: "SC-setting-group"}});

        // Title
        let title_setting_component: TextComponent;
        const title_setting = new Setting(title_and_description_group_element)
            .setName("Prompt title")
            .addExtraButton(icon => icon
                .setTooltip("Try the prompt without executing any shell command.")
                .setIcon("run-command")
                .onClick(() => {
                    // "Dry run" the Prompt
                    this.prompt.openPrompt(null, null, null).then();
                })
            )
            .addText(text => title_setting_component = text
                .setValue(this.prompt.getTitle())
                .onChange(async (new_title: string) => {
                    this.prompt.getConfiguration().title = new_title;
                    await this.plugin.saveSettings();

                    // Update the title in a name setting. (Only if the modal was created from a place where a Prompt name element exists).
                    this.prompt_name_setting?.setName(new_title);
                }),
            )
        ;
        const title_input_element: HTMLInputElement = title_setting.controlEl.find("input") as HTMLInputElement;
        
        // Focus on the title field.
        title_input_element.focus();

        // Autocomplete for Title.
        if (this.plugin.settings.show_autocomplete_menu) {
            createAutocomplete(this.plugin, title_input_element, title_setting_component.onChanged);
        }


        // Description
        let description_setting_component: TextAreaComponent;
        const description_setting = new Setting(title_and_description_group_element)
            .setName("Description")
            .setDesc("Displayed between the prompt title and fields. Both Description and Title support {{variables}}.")
            .addTextArea(textarea => description_setting_component = textarea
                .setValue(this.prompt.configuration.description)
                .onChange(async (new_description: string) => {
                    this.prompt.getConfiguration().description = new_description;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Autocomplete for Description.
        if (this.plugin.settings.show_autocomplete_menu) {
            const description_textarea_element: HTMLTextAreaElement = description_setting.controlEl.find("textarea") as HTMLTextAreaElement;
            const forged_input_element: HTMLInputElement = description_textarea_element as unknown as HTMLInputElement; // Make TypeScript believe this is an HTMLInputElement, because 'kraaden/autocomplete' library does not officially support textareas. This can be problematic!
            createAutocomplete(this.plugin, forged_input_element, description_setting_component.onChanged);
        }

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
        new Setting(container_element)
            .setName("Fields")
            .setDesc("Tip! You can use {{variables}} in 'Field label', 'Default value' and 'Description'.")
        ;
        const prompt_field_model = getModel<PromptFieldModel>(PromptFieldModel.name);
        const fields_container = container_element.createDiv();
        this.prompt.prompt_fields.forEach((prompt_field: PromptField) => {
            prompt_field_model.createSettingFields(prompt_field, fields_container);
        });

        // New field button
        createNewModelInstanceButton<PromptFieldModel, PromptField>(this.plugin, PromptFieldModel.name, container_element, fields_container, this.prompt).then();

        // Execute button text
        let execute_button_text_component: TextComponent;
        new Setting(container_element.createDiv({attr: {class: "SC-setting-group"}}))
            .setName("Execute button text")
            .addText(text => execute_button_text_component = text
                .setValue(this.prompt.configuration.execute_button_text)
                .onChange(async (new_execute_button_text) => {
                    this.prompt.configuration.execute_button_text = new_execute_button_text;
                    await this.plugin.saveSettings();
                }),
            )
        ;

        // Autocomplete for the Execute button text.
        if (this.plugin.settings.show_autocomplete_menu) {
            const execute_button_text_input_element = execute_button_text_component.inputEl;
            createAutocomplete(this.plugin, execute_button_text_input_element, execute_button_text_component.onChanged);
        }

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

        // A tip about CSS styling.
        new Setting(container_element)
            .setDesc("Tip! You can customise the style of the prompt modal with CSS by using the class ." + this.prompt.getCSSClass() + " or ." + Prompt.getCSSBaseClass()+" (for all prompt modals).")
        ;
    }

    public onClose(): void {
        super.onClose();

        // Call a cancelling hook if one is defined (and if the closing happens due to cancelling, i.e. the ok button is NOT clicked).
        if (!this.ok_button_clicked && this.on_after_cancelling) {
            this.on_after_cancelling();
        }
    }
}