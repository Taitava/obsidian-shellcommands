import {Setting} from "obsidian";
import {
    Instance,
    Prompt,
    PromptConfiguration,
    PromptFieldModel,
} from "../../../imports";

export abstract class PromptField extends Instance {

    protected value: string | number;

    constructor(
        public model: PromptFieldModel,
        public prompt: Prompt,
        public configuration: PromptFieldConfiguration,
        public prompt_field_index: keyof PromptConfiguration["fields"], // TODO: 'keyof' is kind of incorrect here, 'keyof' is for objects, but 'SC_MainSettings["custom_variables"]' is an array with numeric indexes.
    ) {
        super(model, configuration, prompt.configuration);
        this.storeValue(this.configuration.default_value);
    }

    public abstract createField(container_element: HTMLElement): Setting;

    public getTitle(): string {
        return this.configuration.label === "" ? "Unlabelled field" : this.configuration.label;
    }

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

export interface PromptFieldConfiguration {
    // type: "text"; // TODO: Uncomment when implementing more values than just "text". No need to decide the value "text" now, it can be changed to "single-line-text" or something else, too.
    label: string;
    // TODO: Add 'description'
    default_value: string;
    //  TODO: Add 'placeholder'.
    target_variable: string;
    required: boolean;
}