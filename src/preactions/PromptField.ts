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
export abstract class PromptField {

    protected value: string | number;

    constructor(
        protected readonly container_element: HTMLElement,
        protected readonly configuration: PromptFieldConfiguration,
    ) {
        this.storeValue(this.configuration.default_value);
        this.createField();
    }

    protected abstract createField(): void;

    protected storeValue(value: string | number) {
        this.value = value;
    }

    /**
     * Ensures that the field is filled, if it's mandatory. If the field is not mandatory, it's always valid.
     *
     * @return True when valid, false when not valid.
     */
    public validate() {
        if (!this.configuration.required) {
            // No need to validate, because the field is not mandatory.
            return true;
        }

        // Ensure the field is filled
        return this.isFilled();
    }

    protected abstract isFilled(): boolean;
}

/**
 * TODO: Make a subfolder "prompt_fields" and extract this class to a new file in that folder.
 */
class PromptField_Text extends PromptField {

    protected value: string;

    protected createField() {
        new Setting(this.container_element)
            .setName(this.configuration.label)
            .addText(text => text
                .setValue(this.configuration.default_value)
                .onChange(value => this.storeValue(value))
            )
        ;
    }

    protected isFilled(): boolean {
        return this.value.length > 0;
    }
}

export interface PromptFieldConfiguration {
    type: "text";
    label: string;
    default_value: string;
    target_variable: string;
    required: boolean;
}