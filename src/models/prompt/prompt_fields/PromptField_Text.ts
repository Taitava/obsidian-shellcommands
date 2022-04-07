import {
    Setting,
    TextComponent,
} from "obsidian";
import {
    createAutocomplete,
    getVariableAutocompleteItems,
    PromptField,
    parseVariables,
    SC_Event,
    SC_Plugin,
    TShellCommand,
} from "src/imports";

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
            createAutocomplete(input_element, getVariableAutocompleteItems(plugin), on_change);
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