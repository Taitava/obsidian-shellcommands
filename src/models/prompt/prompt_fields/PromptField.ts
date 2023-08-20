/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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

import {
    Setting,
    TextAreaComponent,
    TextComponent,
    ToggleComponent,
} from "obsidian";
import {SC_Event} from "../../../events/SC_Event";
import {
    getUsedVariables,
    parseVariables,
} from "../../../variables/parseVariables";
import {TShellCommand} from "../../../TShellCommand";
import {
    CustomVariable,
    CustomVariableInstance,
    Instance,
    Prompt,
    PromptConfiguration,
    PromptFieldModel,
} from "../../../imports";
import {Shell} from "../../../shells/Shell";
import {VariableMap} from "../../../variables/loadVariables";
import SC_Plugin from "../../../main";
import {createAutocomplete} from "../../../settings/setting_elements/Autocomplete";

export class PromptField extends Instance {

    /**
     * Contains a value preview element.
     * @private
     */
    private preview_setting: Setting;

    private parsed_value: string | null;
    private parsing_errors: string[] = [];
    
    private fieldComponent: TextComponent | TextAreaComponent | ToggleComponent; // Add more types when implementing more field types.
    
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
    public async createField(container_element: HTMLElement, t_shell_command: TShellCommand | null, sc_event: SC_Event | null): Promise<void> {
        // Parse variables in common properties.
        const shell: Shell = this.getShell(t_shell_command);
        const label_parsing_result = await parseVariables(
            this.prompt.model.plugin,
            this.configuration.label,
            shell,
            false,
            t_shell_command,
            sc_event,
        );
        const description_parsing_result = await parseVariables(
            this.prompt.model.plugin,
            this.configuration.description,
            shell,
            false,
            t_shell_command,
            sc_event,
        );
        
        // Create a base for the field.
        const setting = new Setting(container_element)
            .setName(label_parsing_result.succeeded ? label_parsing_result.parsed_content as string : label_parsing_result.original_content)
            .setDesc(description_parsing_result.succeeded ? description_parsing_result.parsed_content as string : description_parsing_result.original_content)
        ;
        
        // Create a type specific input field.
        const on_change = () => this.valueHasChanged(t_shell_command, sc_event);
        await this.createTypeSpecificField(setting,on_change);
        
        // Set up onFocus hook.
        let inputElement: HTMLElement;
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
                inputElement = (this.fieldComponent as TextComponent | TextAreaComponent).inputEl;
                break;
            case "toggle":
                inputElement = (this.fieldComponent as ToggleComponent).toggleEl;
                break;
        }
        inputElement.onfocus = () => this.hasGottenFocus();

        // Create a preview setting element. It will not contain any actual setting elements, just text.
        this.preview_setting = new Setting(container_element);

        // Parse variables in the default value and insert it to the field.
        // Note that this is a different "default value" than what TShellCommand considers as variables' default values! This is about a _field's_ default value, not a variable's default value. t_shell_command is passed in order to allow any possible variables in the field's default value to access the variables' default values (which come from TShellCommand).
        await this.applyDefaultValue(t_shell_command, sc_event);
    }

    private async createTypeSpecificField(setting: Setting, onChange: () => void): Promise<void> {
        const plugin: SC_Plugin = this.prompt.model.plugin;
        
        // Create the field
        switch (this.configuration.type) {
            case "single-line-text":
                setting.addText((text_component) => {
                    this.fieldComponent = text_component;
                    text_component.onChange(onChange);
                });
                
                // Show autocomplete menu (if enabled)
                if (plugin.settings.show_autocomplete_menu) {
                    const input_element = setting.controlEl.find("input") as HTMLInputElement;
                    createAutocomplete(plugin, input_element, onChange);
                }
                break;
            
            case "multi-line-text": {
                const textAreaRows: number = this.configuration.rows;
                setting.addTextArea((textAreaComponent) => {
                    this.fieldComponent = textAreaComponent;
                    textAreaComponent.onChange(onChange);
                    textAreaComponent.inputEl.rows = textAreaRows;
                });
                
                // Show autocomplete menu (if enabled).
                if (plugin.settings.show_autocomplete_menu) {
                    const textAreaElement = setting.controlEl.find("textarea") as HTMLTextAreaElement;
                    createAutocomplete(plugin, textAreaElement, onChange);
                }
                break;
            }
            
            case "toggle":
                setting.addToggle((toggleComponent) => {
                    this.fieldComponent = toggleComponent;
                    toggleComponent.onChange(onChange);
                });
                break;
                
            default:
                // @ts-ignore Do not yell when the switch covers all type cases. Ignores this error: TS2339: Property 'type' does not exist on type 'never'.
                throw new Error("Unidentified PromptField type: " + this.configuration.type);
        }
    }

    public getTitle(): string {
        return this.configuration.label === "" ? "Unlabelled field" : this.configuration.label;
    }

    /**
     * Gets a value from the form field.
     * @protected
     */
    private getValue(): string {
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
                return (this.fieldComponent as TextComponent | TextAreaComponent).getValue();
            case "toggle": {
                const toggledOn: boolean = (this.fieldComponent as ToggleComponent).getValue();
                return toggledOn ? this.configuration.on_result : this.configuration.off_result;
            }
        }
    }

    /**
     * Sets a value to the form field.
     * @param value
     * @protected
     */
    private setValue(value: string): void {
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
                (this.fieldComponent as TextComponent | TextAreaComponent).setValue(value);
                break;
            case "toggle": {
                // Translate the value to a boolean state suitable for a toggle:
                // - If the value equals on_result -> Toggle is ON.
                // - If the value equals off_result -> Toggle is OFF.
                // - If the value equals neither on_result nor off_result -> Toggle is OFF.
                // - The comparison is NOT case-sensitive.
                const toggledOn = value.toLocaleLowerCase() === this.configuration.on_result.toLocaleLowerCase();
                (this.fieldComponent as ToggleComponent).setValue(toggledOn);
                break;
            }
            default:
                // @ts-ignore Do not yell when the switch covers all type cases. Ignores this error: TS2339: Property 'type' does not exist on type 'never'.
                throw new Error("Unidentified PromptField type: " + this.configuration.type);
        }
    }

    /**
     * Parses the default value and sets it to the form element.
     * @param t_shell_command
     * @param sc_event
     * @private
     */
    private async applyDefaultValue(t_shell_command: TShellCommand | null, sc_event: SC_Event | null) {
        const default_value = this.configuration.default_value;
        const parsing_result = await parseVariables(
            this.prompt.model.plugin,
            default_value,
            this.getShell(t_shell_command),
            false,
            t_shell_command,
            sc_event
        );
        if (!parsing_result.succeeded) {
            // Parsing failed.
            this.setValue(default_value); // Use the unparsed value. If default value contains a variable that cannot be parsed, a user can see the variable in the prompt modal and either fix it or change it to something else.
        } else {
            // Parsing succeeded.
            this.setValue(parsing_result.parsed_content as string);
        }
        await this.valueHasChanged(t_shell_command, sc_event);
    }

    public getParsedValue(): string | null {
        return this.parsed_value;
    }

    /**
     * Tries to get a parsed value, but if it's not available (probably due to incorrect usage of variables), returns an
     * unparsed value instead().
     */
    public getParsedOrRawValue(): string {
        return this.parsed_value ?? this.getValue();
    }

    public getParsingErrors() {
        return this.parsing_errors;
    }

    /**
     * Updates this.parsed_value, this.parsing_errors and this.preview_setting .
     *
     * @param t_shell_command
     * @param sc_event
     * @private
     */
    private async valueHasChanged(t_shell_command: TShellCommand | null, sc_event: SC_Event | null) {
        let preview: string;

        // Parse variables in the value.
        const parsing_result = await parseVariables(
            this.prompt.model.plugin,
            this.getValue(),
            this.getShell(t_shell_command),
            false,
            t_shell_command,
            sc_event
        );
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
            preview = parsing_result.parsed_content as string;
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
    private hasGottenFocus() {
        if (this.on_focus_callback) {
            this.on_focus_callback(this);
        }
    }

    /**
     * Forces focus on the field.
     */
    public setFocus(): void {
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
                (this.fieldComponent as TextComponent | TextAreaComponent).inputEl.focus();
                break;
            case "toggle": {
                (this.fieldComponent as ToggleComponent).toggleEl.focus();
                break;
            }
            default:
                // @ts-ignore Do not yell when the switch covers all type cases. Ignores this error: TS2339: Property 'type' does not exist on type 'never'.
                throw new Error("Unidentified PromptField type: " + this.configuration.type);
        }
    }
    
    /**
     * Ensures the field is correctly set up. If it's not, a Prompt cannot be opened.
     * Performed checks:
     *  - The field must have a target variable defined.
     *
     * @return True when valid, a string error message when not valid.
     */
    public isConfigurationValid(): true | string {
        // Check that target variable is defined.
        if (!this.configuration.target_variable_id) {
            return `Field '${this.getTitle()}' does not have a target variable.`;
        } else {
            try {
                this.getTargetVariableInstance(); // Just try to get a CustomVariableInstance. No need to use it here, but if this fails, we know the variable is removed.
            } catch (error) {
                return `Field '${this.getTitle()}' uses a target variable which does not exist anymore.`;
            }
        }
        
        // All ok.
        return true;
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

    private isFilled(): boolean {
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
                return this.getValue().length > 0;
            case "toggle":
                // Consider a toggle filled when it's checked.
                return (this.fieldComponent as ToggleComponent).getValue();
        }
    }

    public getTargetVariableInstance(): CustomVariableInstance {
        const target_variable_id = this.configuration.target_variable_id;
        const custom_variable_instance: CustomVariableInstance | undefined = this.prompt.model.plugin.getCustomVariableInstances().get(target_variable_id);
        if (!custom_variable_instance) {
            throw new Error(this.constructor.name + ".getTargetVariableInstance(): CustomVariableInstance with ID '" + target_variable_id + "' was not found");
        }
        return custom_variable_instance;
    }

    public getTargetVariable(): CustomVariable {
        const custom_variable_instance = this.getTargetVariableInstance();
        return custom_variable_instance.getCustomVariable();
    }

    private getShell(tShellCommand: TShellCommand | null): Shell {
        if (tShellCommand) {
            return tShellCommand.getShell();
        }
        // If no shell command is available (= preview mode), use just whatever global default is defined. It's just a preview, so it's enough to have at least some shell.
        return this.prompt.model.plugin.getDefaultShell();
    }
    
    /**
     * Returns {{variables}} used in this PromptField's label, description, and default value.
     *
     * @protected
     */
    protected _getUsedCustomVariables(): VariableMap {
        // Gather parseable content.
        const readVariablesFrom: string[] = [
            this.configuration.label,
            this.configuration.description,
            this.configuration.default_value,
        ];
        
        const usedCustomVariables = getUsedVariables(
            this.model.plugin,
            readVariablesFrom,
            this.model.plugin.getCustomVariables(),
        );
        
        // Add target variable, if defined.
        if (this.configuration.target_variable_id) {
            usedCustomVariables.set(this.configuration.target_variable_id, this.getTargetVariable());
        }
        
        return usedCustomVariables;
    }
    
    /**
     * Iterates all PromptField configuration properties and fills in possibly missing ones. This is needed after changing
     * field type.
     */
    public ensureAllConfigurationPropertiesExist(): void {
        const defaultConfiguration: PromptFieldConfiguration = this.model.getDefaultConfiguration(this.configuration.type);
        let propertyName: keyof PromptFieldConfiguration;
        for (propertyName in defaultConfiguration) {
            if (undefined === this.configuration[propertyName]) {
                // @ts-ignore
                this.configuration[propertyName] = defaultConfiguration[propertyName];
            }
        }
    }
}

export const PromptFieldTypes = {
    "single-line-text": "Single line text",
    "multi-line-text": "Multiline text",
    "toggle": "Toggle",
};

export type PromptFieldType = keyof typeof PromptFieldTypes;

export type PromptFieldConfiguration = {
    type: PromptFieldType;
    label: string;
    description: string;
    default_value: string;
    target_variable_id: string;
    required: boolean;
} & (
    // Type specific properties:
    {
        type: "single-line-text";
        // placeholder: string; // TODO: Implement placeholder property later.
    } | {
        type: "multi-line-text";
        // placeholder: string; // TODO: Implement placeholder property later.
        rows: number;
    } | {
        type: "toggle";
        on_result: string;
        off_result: string;
    }
);