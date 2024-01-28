/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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
    DropdownComponent,
    Setting,
    TextAreaComponent,
    TextComponent,
    ToggleComponent,
} from "obsidian";
import {SC_Event} from "../../../events/SC_Event";
import {
    getUsedVariables,
    parseVariables,
    ParsingResult,
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
import {decorateMultilineField} from "../../../settings/setting_elements/multilineField";
import {DEBUG_ON} from "../../../Debug";
import {CmdOrCtrl} from "../../../Hotkeys";
import {
    deepEqual,
    ensureObjectHasProperties,
    getObjectSurplusProperties,
} from "../../../Common";

export class PromptField extends Instance {

    /**
     * Contains a value preview element.
     * @private
     */
    private preview_setting: Setting;

    private parsed_value: string | null;
    private parsing_errors: string[] = [];
    
    private fieldComponent: TextComponent | TextAreaComponent | ToggleComponent | DropdownComponent; // Add more types when implementing more field types.
    
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
        await this.createTypeSpecificField(
            setting,
            on_change,
            t_shell_command,
            sc_event,
        );
        
        // Set up onFocus hook.
        let inputElement: HTMLElement;
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
            case "password":
                inputElement = (this.fieldComponent as TextComponent | TextAreaComponent).inputEl;
                break;
            case "toggle":
                inputElement = (this.fieldComponent as ToggleComponent).toggleEl;
                break;
            case "single-choice":
                inputElement = (this.fieldComponent as DropdownComponent).selectEl;
                break;
        }
        inputElement.onfocus = () => this.hasGottenFocus();

        // Create a preview setting element. It will not contain any actual setting elements, just text.
        this.preview_setting = new Setting(container_element);

        // Parse variables in the default value and insert it to the field.
        // Note that this is a different "default value" than what TShellCommand considers as variables' default values! This is about a _field's_ default value, not a variable's default value. t_shell_command is passed in order to allow any possible variables in the field's default value to access the variables' default values (which come from TShellCommand).
        await this.applyDefaultValue(t_shell_command, sc_event);
    }

    private async createTypeSpecificField(
        setting: Setting,
        onChange: () => void,
        tShellCommand: TShellCommand | null,
        scEvent: SC_Event | null,
    ): Promise<void> {
        const plugin: SC_Plugin = this.prompt.model.plugin;
        
        // Create the field
        switch (this.configuration.type) {
            case "single-line-text":
            case "password": {
                const isPassword = this.configuration.type === "password";
                setting.addText((text_component) => {
                    this.fieldComponent = text_component;
                    text_component.onChange(onChange);
                    
                    if (isPassword) {
                        text_component.inputEl.type = "password";
                        if (DEBUG_ON) {
                            // Warn about logging passwords.
                            setting.descEl.insertAdjacentHTML("beforebegin", "<strong>SC debug mode is on!</strong> Any passwords entered will be logged to console ("+CmdOrCtrl()+" + " + (process.platform === "darwin" ? "Option" : "Shift") + " + I) when variables are parsed. <strong>Do not enter important passwords when the debug mode is on!</strong>");
                        }
                        text_component.setPlaceholder("Passwords are handled without encryption.");
                    }
                });
                
                // Show autocomplete menu (if enabled) - but not for password field. (An autocomplete might reveal what was typed in the field, and passwords are probably not stored in autocomplete lists.)
                if (plugin.settings.show_autocomplete_menu && !isPassword) {
                    const input_element = setting.controlEl.find("input") as HTMLInputElement;
                    createAutocomplete(plugin, input_element, onChange);
                }
                break;
            }
            
            case "multi-line-text": {
                setting.addTextArea((textAreaComponent) => {
                    this.fieldComponent = textAreaComponent;
                    decorateMultilineField(this.model.plugin, textAreaComponent, onChange, 2);
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
                
            case "single-choice": {
                // Scaffold a list of dropdown options
                const dropdownOptions: Record<string, string> = {};
                for (const choice of this.configuration.choices) {
                    let choiceValue: string;
                    let choiceLabel: string;
                    if (Array.isArray(choice)) {
                        // Different value and label.
                        [choiceValue, choiceLabel] = choice;
                    } else {
                        // Unified value and label.
                        choiceValue = choiceLabel = choice;
                    }
                    
                    // Parse variables in choiceValue.
                    const choiceValueParsingResult = await parseVariables(
                        this.prompt.model.plugin,
                        choiceValue,
                        this.getShell(tShellCommand),
                        false,
                        tShellCommand,
                        scEvent,
                    );
                    if (choiceValueParsingResult.succeeded) {
                        choiceValue = choiceValueParsingResult.parsed_content as string;
                    }
                    
                    // Parse variables in choiceLabel.
                    const choiceLabelParsingResult = await parseVariables(
                        this.prompt.model.plugin,
                        choiceLabel,
                        this.getShell(tShellCommand),
                        false,
                        tShellCommand,
                        scEvent,
                    );
                    if (choiceLabelParsingResult.succeeded) {
                        choiceLabel = choiceLabelParsingResult.parsed_content as string;
                    }
                    
                    // Add to dropdown options.
                    dropdownOptions[choiceValue] = choiceLabel;
                }
                
                // Create the dropdown.
                setting.addDropdown((dropdownComponent) => {
                    this.fieldComponent = dropdownComponent;
                    dropdownComponent.addOptions(dropdownOptions);
                    dropdownComponent.onChange(onChange);
                });
                break;
            }
                
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
            case "password":
            case "single-choice":
                return (this.fieldComponent as TextComponent | TextAreaComponent | DropdownComponent).getValue();
            case "toggle": {
                const toggledOn: boolean = (this.fieldComponent as ToggleComponent).getValue();
                return toggledOn ? this.configuration.on_result : this.configuration.off_result;
            }
        }
    }

    /**
     * Sets a value to the form field.
     * @param value
     * @param tShellCommand Used for variable parsing if the field is a toggle.
     * @param scEvent Used for variable parsing if the field is a toggle.
     * @protected
     */
    private async setValue(value: string, tShellCommand: TShellCommand | null, scEvent: SC_Event | null): Promise<void> {
        switch (this.configuration.type) {
            case "single-line-text":
            case "multi-line-text":
            case "password":
                (this.fieldComponent as TextComponent | TextAreaComponent).setValue(value);
                break;
            case "toggle": {
                // Parse variables in onResult.
                let onResult: string = this.configuration.on_result;
                const onResultParsingResult: ParsingResult = await parseVariables(
                    this.model.plugin,
                    onResult,
                    this.getShell(tShellCommand),
                    false,
                    tShellCommand,
                    scEvent,
                );
                if (onResultParsingResult.succeeded) {
                    onResult = onResultParsingResult.parsed_content as string;
                }
                // Translate the value to a boolean state suitable for a toggle:
                // - If the value equals on_result -> Toggle is ON.
                // - If the value equals off_result -> Toggle is OFF.
                // - If the value equals neither on_result nor off_result -> Toggle is OFF.
                // - The comparison is NOT case-sensitive.
                const toggledOn = value.toLocaleLowerCase() === onResult.toLocaleLowerCase();
                (this.fieldComponent as ToggleComponent).setValue(toggledOn);
                break;
            }
            case "single-choice": {
                const dropdownComponent = (this.fieldComponent as DropdownComponent);
                let valueExistsInChoices: boolean = false;
                for (const optionElement of Array.from(dropdownComponent.selectEl.options)) {
                    const choiceValue: string = optionElement.value;
                    if (choiceValue.toLocaleLowerCase() === value.toLocaleLowerCase()) {
                        // The given value exists as an option. Select it.
                        dropdownComponent.setValue(choiceValue);
                        valueExistsInChoices = true;
                    }
                }
                if (!valueExistsInChoices) {
                    // The given value does not exist. Select the first option.
                    const firstOptionElement = dropdownComponent.selectEl.options.item(0);
                    if (null !== firstOptionElement) {
                        dropdownComponent.setValue(firstOptionElement.value);
                    }
                }
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
            await this.setValue(default_value, t_shell_command, sc_event); // Use the unparsed value. If default value contains a variable that cannot be parsed, a user can see the variable in the prompt modal and either fix it or change it to something else.
        } else {
            // Parsing succeeded.
            await this.setValue(parsing_result.parsed_content as string, t_shell_command, sc_event);
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
        let preview: string = "";
        
        const dontParseFieldTypes: PromptFieldType[] = [
            "single-choice",  // If type is "single-choice", variables are already parsed in the field's options.
            "password", // Passwords are static.
        ];
        const doParseVariables = !dontParseFieldTypes.contains(this.configuration.type);
        if (doParseVariables) {
            // Parse variables in the value.
            const parsing_result = await parseVariables(
                this.prompt.model.plugin,
                this.getValue(),
                this.getShell(t_shell_command),
                false,
                t_shell_command,
                sc_event,
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
            
            if (0 === parsing_result.count_parsed_variables) {
                // If no variables were used, hide the description as it's not needed to repeat the value that already shows up in the form field.
                preview = "";
            }
        } else {
            // No need to parse variables, as they are already parsed before.
            this.parsed_value = this.getValue();
            this.parsing_errors = []; // This probably is already an empty array, but just make sure.
        }
        
        // Update the preview element.
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
            case "password":
                (this.fieldComponent as TextComponent | TextAreaComponent).inputEl.focus();
                break;
            case "toggle": {
                (this.fieldComponent as ToggleComponent).toggleEl.focus();
                break;
            }
            case "single-choice":
                (this.fieldComponent as DropdownComponent).selectEl.focus();
                break;
            default:
                // @ts-ignore Do not yell when the switch covers all type cases. Ignores this error: TS2339: Property 'type' does not exist on type 'never'.
                throw new Error("Unidentified PromptField type: " + this.configuration.type);
        }
    }
    
    /**
     * Ensures the field is correctly set up. If it's not, a Prompt cannot be opened.
     * Performed checks:
     *  - The field must have a target variable defined.
     *  - A dropdown field has less than two choices.
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
        
        // Type specific checks.
        switch (this.configuration.type) {
            case "single-choice":
                if (Object.getOwnPropertyNames(this.configuration.choices).length < 2) { // FIXME: The check does not work, it always turns out as valid.
                    return `Dropdown field '${this.getTitle()}' must have at least two options.`;
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
            case "password":
            case "single-choice": // Dropdown can also use the length logic - nothing is selected if the selected option's value is an empty string.
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
        ensureObjectHasProperties(this.configuration, defaultConfiguration);
    }
    
    /**
     * Removes configuration properties that are not used by the current field type. Exception: a surplus property is
     * not removed, if its value differs from the property's default value.
     */
    public removeSurplusConfigurationProperties(): void {
        const defaultConfiguration: PromptFieldConfiguration = this.model.getDefaultConfiguration(this.configuration.type);
        const surplusProperties: Partial<PromptFieldConfiguration> = getObjectSurplusProperties(this.configuration, defaultConfiguration);
        const combinedDefaultConfigurations: PromptFieldConfiguration = this.model.combineAllDefaultConfigurations();
        
        let propertyName: keyof PromptFieldConfiguration;
        for (propertyName in surplusProperties) {
            if (deepEqual(this.configuration[propertyName], combinedDefaultConfigurations[propertyName])) {
                // This property's value is the same as the default value, and it does not belong to the current field type's configuration, so it can be removed.
                delete this.configuration[propertyName];
            }
            // If the value is different from the default value, then it's wise to keep the surplus property, so that if user changes back to a field type that uses the property, they will not lose the value.
        }
    }
}

export const PromptFieldTypes = {
    "single-line-text": "Single line text",
    "multi-line-text": "Multiline text",
    "toggle": "Toggle",
    "single-choice": "Dropdown menu",
    "password": "Password",
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
        type: "single-line-text" | "password";
        // placeholder: string; // TODO: Implement placeholder property later.
    } | {
        type: "multi-line-text";
        // placeholder: string; // TODO: Implement placeholder property later.
    } | {
        type: "toggle";
        on_result: string;
        off_result: string;
    } | {
        type: "single-choice";
        choices: (string | [string, string])[],
    }
);