import {
    PromptFieldConfiguration,
} from "../../../imports";

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

    public getValue() {
        return this.value;
    }

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