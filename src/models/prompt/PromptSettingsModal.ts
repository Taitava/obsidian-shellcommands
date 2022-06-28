/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

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

    private approved = false;

    constructor(
        plugin: SC_Plugin,
        private readonly prompt: Prompt,

        /** Can be undefined if the modal is created from a place where there is no name element. */
        private readonly prompt_name_setting?: Setting,

        /** If defined, a button will be added and on_after_approval() / on_after_cancelling() will be called depending on whether the button was clicked or not. */
        private readonly ok_button_text?: string,
        private readonly on_after_approval?: () => void,
        private readonly on_after_cancelling?: () => void,
    ) {
        super(plugin);
    }

    public onOpen(): void {
        super.onOpen();
        const container_element = this.modalEl;
        const title_and_description_group_element = container_element.createDiv({attr: {class: "SC-setting-group"}});

        // Title
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
            .addText(text => text
                .setValue(this.prompt.getTitle())
                .onChange(async (new_title: string) => {
                    this.prompt.getConfiguration().title = new_title;
                    await this.plugin.saveSettings();

                    // Update the title in a name setting. (Only if the modal was created from a place where a Prompt name element exists).
                    this.prompt_name_setting?.setName(new_title);
                })
                .then((title_setting_component: TextComponent) => {
                    // Autocomplete for Title.
                    if (this.plugin.settings.show_autocomplete_menu) {
                        createAutocomplete(this.plugin, title_setting_component.inputEl, () => title_setting_component.onChanged());
                    }
                }),
            )
        ;
        const title_input_element: HTMLInputElement = title_setting.controlEl.find("input") as HTMLInputElement;
        
        // Focus on the title field.
        title_input_element.focus();

        // Description
        new Setting(title_and_description_group_element)
            .setName("Description")
            .setDesc("Displayed between the prompt title and fields. Both Description and Title support {{variables}}.")
            .addTextArea(textarea => textarea
                .setValue(this.prompt.configuration.description)
                .onChange(async (new_description: string) => {
                    this.prompt.getConfiguration().description = new_description;
                    await this.plugin.saveSettings();
                })
                .then((description_component: TextAreaComponent) => {
                    // Autocomplete for Description.
                    if (this.plugin.settings.show_autocomplete_menu) {
                        createAutocomplete(this.plugin, description_component.inputEl, () => description_component.onChanged());
                    }
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
        new Setting(container_element.createDiv({attr: {class: "SC-setting-group"}}))
            .setName("Execute button text")
            .addText(text => text
                .setValue(this.prompt.configuration.execute_button_text)
                .onChange(async (new_execute_button_text) => {
                    this.prompt.configuration.execute_button_text = new_execute_button_text;
                    await this.plugin.saveSettings();
                })
                .then((execute_button_text_component: TextComponent) => {
                    // Autocomplete for the Execute button text.
                    if (this.plugin.settings.show_autocomplete_menu) {
                        createAutocomplete(this.plugin, execute_button_text_component.inputEl, () => execute_button_text_component.onChanged());
                    }
                }),
            )
        ;


        // Ok button
        if (this.ok_button_text) {
            new Setting(container_element)
                .addButton(button => button
                    .setButtonText(this.ok_button_text)
                    .onClick(() => this.approve()),
                )
            ;
        }

        // A tip about CSS styling.
        new Setting(container_element)
            .setDesc("Tip! You can customise the style of the prompt modal with CSS by using the class ." + this.prompt.getCSSClass() + " or ." + Prompt.getCSSBaseClass()+" (for all prompt modals).")
        ;
    }

    protected approve(): void {
        if (this.on_after_approval) {
            this.approved = true;
            this.on_after_approval();
        }
        this.close();
    }

    public onClose(): void {
        super.onClose();

        // Call a cancelling hook if one is defined (and if the closing happens due to cancelling, i.e. the ok button is NOT clicked).
        if (!this.approved && this.on_after_cancelling) {
            this.on_after_cancelling();
        }
    }
}