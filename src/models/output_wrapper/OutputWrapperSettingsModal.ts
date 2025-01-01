/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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
} from "obsidian";
import {OutputWrapper} from "./OutputWrapper";
import {createAutocomplete} from "../../settings/setting_elements/Autocomplete";
import {Variable_Output} from "../../variables/Variable_Output";

export class OutputWrapperSettingsModal extends SC_Modal {

    private approved = false;

    constructor(
        plugin: SC_Plugin,
        private readonly output_wrapper: OutputWrapper,

        /** Can be undefined if the output wrapper is created from a place where there is no name element. */
        private readonly output_wrapper_name_setting?: Setting,

        /** If defined, a button will be added and on_after_approval() / on_after_cancelling() will be called depending on whether the button was clicked or not. */
        private readonly ok_button_text?: string,

        private readonly on_after_approval?: () => void,
        private readonly on_after_cancelling?: () => void,
    ) {
        super(plugin);
    }

    public onOpen(): void {
        super.onOpen();
        const container_element = this.modalEl.createDiv();
        container_element.addClass("SC-setting-group"); // Make setting fields wider in this container.

        // Title
        const title_setting = new Setting(container_element)
            .setName("Output wrapper title")
            .setDesc("Only used in settings, will not appear in output.")
            .addText(text => text
                .setValue(this.output_wrapper.getTitle())
                .onChange(async (new_title: string) => {
                    this.output_wrapper.getConfiguration().title = new_title;
                    await this.plugin.saveSettings();

                    // Update the title in a name setting. (Only if the modal was created from a place where an OutputWrapper name element exists).
                    this.output_wrapper_name_setting?.setName(new_title);
                })
            )
        ;
        const title_input_element: HTMLInputElement = title_setting.controlEl.find("input") as HTMLInputElement;

        // Content
        const output_variable = new Variable_Output(this.plugin, ""); // For getting an autocomplete item.
        new Setting(container_element)
            .setName("Content")
            .setDesc("Use {{output}} as a placeholder for text that will be received from a shell command. Other variables are available, too.")
            .addTextArea(textarea_component => textarea_component
                .setValue(this.output_wrapper.configuration.content)
                .onChange(async (new_content: string) => {
                    this.output_wrapper.configuration.content = new_content;
                    await this.plugin.saveSettings();
                })
                .then((textarea_component) => {
                    // Autocomplete for Content.
                    if (this.plugin.settings.show_autocomplete_menu) {
                        createAutocomplete(
                            this.plugin,
                            textarea_component.inputEl,
                            () => textarea_component.onChanged(),
                            output_variable.getAutocompleteItems(),
                        );
                    }
                }),
            )
        ;

        // Focus on the title field.
        title_input_element.focus();

        // Ok button
        const okButtonText: string | undefined = this.ok_button_text;
        if (okButtonText) {
            new Setting(container_element)
                .addButton(button => button
                    .setButtonText(okButtonText)
                    .onClick(() => this.approve()),
                )
            ;
        }
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