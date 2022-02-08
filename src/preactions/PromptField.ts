import {Setting} from "obsidian";

export function createPrompField(container_element: HTMLElement, field_configuration: PromptFieldConfiguration): PromptField {
    switch (field_configuration.type) {
        case "text":
            return new PromptField_Text(container_element, field_configuration);
    }
}

/**
 * TODO: Make a subfolder "prompt_fields" and extract this class to a new file in that folder.
 */
abstract class PromptField {
    constructor(
        protected readonly container_element: HTMLElement,
        protected readonly configuration: PromptFieldConfiguration,
    ) {
        this.createField();
    }

    protected abstract createField(): Setting;

    protected handle_change(value: string | number | boolean) {
        // TODO
    }
}

/**
 * TODO: Make a subfolder "prompt_fields" and extract this class to a new file in that folder.
 */
class PromptField_Text extends PromptField {

    public createField(): Setting {
        return new Setting(this.container_element)
            .setName(this.configuration.label)
            .addText(text => text
                .setValue(this.configuration.default_value)
                .onChange(this.handle_change)
            )
        ;
    }
}

export interface PromptFieldConfiguration {
    type: "text";
    label: string;
    default_value: string;
    target_variable: string;
    required: boolean;
}