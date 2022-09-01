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

import {
    Setting,
    TextComponent,
} from "obsidian";
import {createAutocomplete} from "../../../settings/setting_elements/Autocomplete";
import SC_Plugin from "../../../main";
import {SC_Event} from "../../../events/SC_Event";
import {parseVariables} from "../../../variables/parseVariables";
import {TShellCommand} from "../../../TShellCommand";
import {
    PromptField,
} from "../../../imports";

export class PromptField_Text extends PromptField {

    private text_component: TextComponent;

    protected _createField(container_element: HTMLElement, t_shell_command: TShellCommand | null, sc_event: SC_Event | null) {
        const plugin: SC_Plugin = this.prompt.model.plugin;

        // Create the field
        const on_change = () => this.valueHasChanged(t_shell_command, sc_event);
        const label_parsing_result = parseVariables(this.prompt.model.plugin, this.configuration.label, null, t_shell_command, sc_event);
        const description_parsing_result = parseVariables(this.prompt.model.plugin, this.configuration.description, null, t_shell_command, sc_event);
        const setting = new Setting(container_element)
            .setName(label_parsing_result.succeeded ? label_parsing_result.parsed_content : label_parsing_result.original_content)
            .setDesc(description_parsing_result.succeeded ? description_parsing_result.parsed_content : description_parsing_result.original_content)
            .addText((text_component) => {
                this.text_component = text_component;
                text_component.onChange(on_change);
            })
        ;

        // Set up onFocus hook.
        this.text_component.inputEl.onfocus = () => {
            this.hasGottenFocus();
        };

        // Show autocomplete menu (if enabled)
        if (plugin.settings.show_autocomplete_menu) {
            const input_element = setting.controlEl.find("input") as HTMLInputElement;
            createAutocomplete(plugin, input_element, on_change);
        }
    }

    protected setValue(value: string): void {
        this.text_component.setValue(value);
    }

    protected getValue(): string {
        return this.text_component.getValue();
    }

    public setFocus(): void {
        this.text_component.inputEl.focus();
    }

    protected isFilled(): boolean {
        return this.getValue().length > 0;
    }
}