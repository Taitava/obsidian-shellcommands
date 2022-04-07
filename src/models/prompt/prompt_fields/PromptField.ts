import {Setting} from "obsidian";
import {
    CustomVariable,
    CustomVariableInstance,
    Instance,
    parseVariables,
    Prompt,
    PromptConfiguration,
    PromptFieldModel,
    SC_Event,
    TShellCommand,
} from "src/imports";

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
     * @param t_shell_command
     * @param sc_event Used when parsing variables for default_value and the inputted value. Needed so that also {{event_*}} variables can be used in prompts.
     */
    public createField(container_element: HTMLElement, t_shell_command: TShellCommand | null, sc_event: SC_Event | null): void {
        this._createField(container_element, t_shell_command, sc_event);

        // Create a preview setting element. It will not contain any actual setting elements, just text.
        this.preview_setting = new Setting(container_element);

        // Parse variables in the default value and insert it to the field.
        // Note that this is a different "default value" than what TShellCommand considers as variables' default values! This is about a _field's_ default value, not a variable's default value. t_shell_command is passed in order to allow any possible variables in the field's default value to access the variables' default values (which come from TShellCommand).
        this.applyDefaultValue(t_shell_command, sc_event);
    }

    protected abstract _createField(container_element: HTMLElement, t_shell_command: TShellCommand | null, sc_event: SC_Event | null): void;

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
     * @param t_shell_command
     * @param sc_event
     * @private
     */
    private applyDefaultValue(t_shell_command: TShellCommand | null, sc_event: SC_Event | null) {
        const default_value = this.configuration.default_value;
        const parsing_result = parseVariables(this.prompt.model.plugin, default_value, null, t_shell_command, sc_event);
        if (!parsing_result.succeeded) {
            // Parsing failed.
            this.setValue(default_value); // Use the unparsed value. If default value contains a variable that cannot be parsed, a user can see the variable in the prompt modal and either fix it or change it to something else.
        } else {
            // Parsing succeeded.
            this.setValue(parsing_result.parsed_content);
        }
        this.valueHasChanged(t_shell_command, sc_event);
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
     * @param t_shell_command
     * @param sc_event
     * @protected
     */
    protected valueHasChanged(t_shell_command: TShellCommand | null, sc_event: SC_Event) {
        let preview: string;

        // Parse variables in the value.
        const parsing_result = parseVariables(this.prompt.model.plugin, this.getValue(), null, t_shell_command,sc_event);
        if (!parsing_result.succeeded) {
            // Parsing failed.
            this.parsed_value = null;
            if (parsing_result.error_messages.length > 0) {
                // Display the first error message. If there are more, others can be omitted.
                preview = parsing_result.error_messages[0];
            } else {
                // If there are no error messages, then errors are silently ignored by user's variable configuration, in which case just show the original content.
                preview = parsing_result.original_content;
            }
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

        // Call a possible external callback
        if (this.on_change_callback) {
            this.on_change_callback();
        }
    }

    /**
     * @param on_change_callback A callback that will be called whenever the field's value is changed.
     */
    public onChange(on_change_callback: () => void) {
        this.on_change_callback = on_change_callback;
    }
    private on_change_callback?: () => void;

    /**
     * @param on_focus_callback A callback that will be called whenever the field is focused.
     */
    public onFocus(on_focus_callback: (prompt_field: PromptField) => void) {
        this.on_focus_callback = on_focus_callback;
    }
    private on_focus_callback?: (prompt_field: PromptField) => void;

    /**
     * Should be called by the subclass when the field has gotten focus.
     */
    protected hasGottenFocus() {
        if (this.on_focus_callback) {
            this.on_focus_callback(this);
        }
    }

    /**
     * Forces focus on the field.
     */
    public abstract setFocus(): void;

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