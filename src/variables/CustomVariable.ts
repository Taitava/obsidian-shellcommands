import {Variable} from "./Variable";
import SC_Plugin from "../main";
import {CustomVariableInstance} from "../models/custom_variable/CustomVariableInstance";
import {resetVariableAutocompleteItems} from "./getVariableAutocompleteItems";

/**
 * This class serves as the actual operational variable class for custom variables. It's paired with the CustomVariableInstance class, which acts
 * as a configuration class to handle settings together with CustomVariableModel class.
 */
export class CustomVariable extends Variable {

    private value: string | null = null; // TODO: When implementing variable types, make this class abstract and let subclasses define the type of this property.

    protected always_available = false;

    constructor(
        plugin: SC_Plugin,
        private custom_variable_instance: CustomVariableInstance
    ) {
        super(plugin);
        this.updateProperties();
    }

    public generateValue() {
        if (null === this.value) {
            this.newErrorMessage("This custom variable does not have a value yet, and no default value is defined.")
            return null;
        }
        return this.value;
    }

    public setValue(value: string) {
        const old_value = this.value;
        this.value = value;

        // Call the onChange hook.
        this.callOnChangeCallbacks(value, old_value ?? ""); // Use "" if old_value is null.
    }

    /**
     * Retrieves variable_name and help_text properties from the associated CustomVariableInstance.
     * Called when loading the CustomVariable and when the associated CustomVariableInstance's settings are changed.
     */
    public updateProperties() {
        this.variable_name = this.custom_variable_instance.getPrefixedName();
        this.help_text = this.custom_variable_instance.configuration.description;
        resetVariableAutocompleteItems(); // Make autocomplete lists reload their content in order to get the new variable name/help text.
    }

    public getIdentifier() {
        return this.custom_variable_instance.getID();
    }

    /**
     * Adds the given callback function to a stack of functions that will be called whenever this CustomVariable's value changes.
     * @param on_change_callback
     */
    public onChange(on_change_callback: TCustomVariableOnChangeCallback) {
        this.on_change_callbacks.add(on_change_callback);
    }
    private on_change_callbacks = new Set<TCustomVariableOnChangeCallback>();

    private callOnChangeCallbacks(new_value: string, old_value: string) {
        for (const on_change_callback of this.on_change_callbacks) {
            on_change_callback(this, new_value, old_value);
        }
    }

    /**
     * Returns true if the CustomVariable has an assigned value.
     */
    public isAvailable(): boolean {
        return null !== this.value;
    }
}

type TCustomVariableOnChangeCallback = (variable: CustomVariable, new_value: string, old_value: string) => void;