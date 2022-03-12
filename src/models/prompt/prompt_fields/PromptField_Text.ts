import {
    Setting,
    TextComponent,
} from "obsidian";
import {createAutocomplete} from "../../../settings/setting_elements/Autocomplete";
import {getVariableAutocompleteItems} from "../../../variables/getVariableAutocompleteItems";
import SC_Plugin from "../../../main";
import {SC_Event} from "../../../events/SC_Event";
import {
    PromptField,
} from "../../../imports";

export class PromptField_Text extends PromptField {

    private text_component: TextComponent;

    protected _createField(container_element: HTMLElement, sc_event: SC_Event | null) {
        const plugin: SC_Plugin = this.prompt.model.plugin;

        // Create the field
        const on_change = () => this.valueHasChanged(sc_event);
        const setting = new Setting(container_element)
            .setName(this.configuration.label)
            .addText((text_component) => {
                this.text_component = text_component;
                text_component.onChange(on_change);
            })
        ;

        // Show autocomplete menu (if enabled)
        if (plugin.settings.show_autocomplete_menu) {
            const input_element = setting.controlEl.find("input") as HTMLInputElement;
            createAutocomplete(input_element, getVariableAutocompleteItems(plugin), on_change);
        }
    }

    protected setValue(value: string): void {
        this.text_component.setValue(value);
    }

    protected getValue(): string {
        return this.text_component.getValue();
    }

    protected isFilled(): boolean {
        return this.getValue().length > 0;
    }
}