import {
    CustomVariableInstance,
    SC_Plugin,
    Variable,
} from "src/imports";

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
        this.variable_name = custom_variable_instance.getPrefixedName();
        this.help_text = custom_variable_instance.configuration.description;
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