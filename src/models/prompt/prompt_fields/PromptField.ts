import {Setting} from "obsidian";
import {SC_Event} from "../../../events/SC_Event";
import {parseVariables} from "../../../variables/parseVariables";
import {
    CustomVariable,
    CustomVariableInstance,
    Instance,
    Prompt,
    PromptConfiguration,
    PromptFieldModel,
} from "../../../imports";

export abstract class PromptField extends Instance {

    /**
     * Contains a value preview element.
     * @protected
     */
    protected preview_setting: Setting;

    private parsed_value: string;
    private parsing_errors: string[] = [];

    constructor(
        public model: PromptFieldModel,
        public prompt: Prompt,
        public configuration: PromptFieldConfiguration,
        public prompt_field_index: keyof PromptConfiguration["fields"], // TODO: 'keyof' is kind of incorrect here, 'keyof' is for objects, but 'SC_MainSettings["custom_variables"]' is an array with numeric indexes.
    ) {
        super(model, configuration, prompt.configuration);
    }

    /**
     *
     * @param container_element
     * @param sc_event Used when parsing variables for default_value and the inputted value. Needed so that also {{event_*}} variables can be used in prompts.
     */
    public createField(container_element: HTMLElement, sc_event: SC_Event | null): void {
        this._createField(container_element, sc_event);

        // Create a preview setting element. It will not contain any actual setting elements, just text.
        this.preview_setting = new Setting(container_element);

        // Parse variable in the default value and insert it to the field.
        this.applyDefaultValue(sc_event);
    }

    protected abstract _createField(container_element: HTMLElement, sc_event: SC_Event | null): void;

    public getTitle(): string {
        return this.configuration.label === "" ? "Unlabelled field" : this.configuration.label;
    }

    /**
     * Gets a value from the form field.
     * @protected
     */
    protected abstract getValue(): any;

    /**
     * Sets a value to the form field.
     * @param value
     * @protected
     */
    protected abstract setValue(value: any): void;

    /**
     * Parses the default value and sets it to the form element.
     * @param sc_event
     * @private
     */
    private applyDefaultValue(sc_event: SC_Event | null) {
        const default_value = this.configuration.default_value;
        const parsing_result = parseVariables(this.prompt.model.plugin, default_value, null, sc_event);
        if (!parsing_result.succeeded) {
            // Parsing failed.
            this.setValue(default_value); // Use the unparsed value. If default value contains a variable that cannot be parsed, a user can see the variable in the prompt modal and either fix it or change it to something else.
        } else {
            // Parsing succeeded.
            this.setValue(parsing_result.parsed_content);
        }
        this.valueHasChanged(sc_event);
    }

    public getParsedValue() {
        return this.parsed_value;
    }

    public getParsingErrors() {
        return this.parsing_errors;
    }

    /**
     * Updates this.parsed_value, this.parsing_errors and this.preview_setting .
     *
     * @param sc_event
     * @protected
     */
    protected valueHasChanged(sc_event: SC_Event) {
        let preview: string;

        // Parse variables in the value.
        const parsing_result = parseVariables(this.prompt.model.plugin, this.getValue(), null, sc_event);
        if (!parsing_result.succeeded) {
            // Parsing failed.
            this.parsed_value = null;
            preview = parsing_result.error_messages[0]; // Display the first error message. If there are more, others can be omitted.
            this.parsing_errors = parsing_result.error_messages;
        } else {
            // Parsing succeeded
            this.parsed_value = parsing_result.parsed_content;
            preview = parsing_result.parsed_content;
            this.parsing_errors = []; // No errors.
        }

        // Update the preview element.
        if (0 === parsing_result.count_parsed_variables) {
             // If no variables were used, hide the description as it's not needed to repeat the value that already shows up in the form field.
            preview = "";
        }
        this.preview_setting.setDesc(preview);
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

    public getTargetVariableInstance(): CustomVariableInstance {
        const target_variable_id = this.configuration.target_variable_id;
        const custom_variable_instance: CustomVariableInstance = this.prompt.model.plugin.getCustomVariableInstances().get(target_variable_id);
        if (!custom_variable_instance) {
            throw new Error(this.constructor.name + ".getTargetVariableInstance(): CustomVariableInstance with ID '" + target_variable_id + "' was not found");
        }
        return custom_variable_instance;
    }

    public getTargetVariable(): CustomVariable {
        const custom_variable_instance = this.getTargetVariableInstance();
        return custom_variable_instance.getCustomVariable();
    }
}

export interface PromptFieldConfiguration {
    // type: "text"; // TODO: Uncomment when implementing more values than just "text". No need to decide the value "text" now, it can be changed to "single-line-text" or something else, too.
    label: string;
    description: string;
    default_value: string;
    //  TODO: Add 'placeholder'.
    target_variable_id: string;
    required: boolean;
}