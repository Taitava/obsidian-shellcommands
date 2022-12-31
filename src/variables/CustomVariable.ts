/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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
    GlobalVariableDefaultValueConfiguration,
    Variable,
} from "./Variable";
import SC_Plugin from "../main";
import {CustomVariableInstance} from "../models/custom_variable/CustomVariableInstance";
import {resetVariableAutocompleteItems} from "./getVariableAutocompleteItems";
import {debugLog} from "../Debug";

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
        debugLog(`Loaded CustomVariable ${this.variable_name}.`);
    }

    public generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            if (null === this.value) {
                debugLog(`Custom variable ${this.variable_name} does not have a value yet, and no default value is defined.`)
                this.newErrorMessage("This custom variable does not have a value yet, and no default value is defined.")
                return resolve(null);
            }
            return resolve(this.value);
        });
    }

    /**
     * TODO: Make it possible to prevent calling onChange callbacks:
     *  - Make it possible to call the callbacks later outside this class.
     *  - This makes it possible to prevent unnecessary CustomVariableView updates when multiple CustomVariables are assigned values in one go (via Shell command URI).
     *  - Store the old value into some kind of history list.
     *  - When calling the callbacks, the current CustomVariable should be passed as a parameter instead of the 'value' and 'old_value' parameters (which can be accessed via the CustomVariable object).
     *
     * @param value
     */
    public async setValue(value: string) {
        const old_value = this.value;
        debugLog(`CustomVariable ${this.variable_name}: Setting value to: ${value} (old was: ${old_value}).`);
        this.value = value;

        // Call the onChange hook.
        await this.callOnChangeCallbacks(value, old_value ?? ""); // Use "" if old_value is null.
    }

    /**
     * Retrieves variable_name and help_text properties from the associated CustomVariableInstance.
     * Called when loading the CustomVariable and when the associated CustomVariableInstance's settings are changed.
     */
    public updateProperties() {
        debugLog(`CustomVariable ${this.variable_name}: Updating variable name and help text.`);
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

    private async callOnChangeCallbacks(new_value: string, old_value: string) {
        debugLog(`CustomVariable ${this.variable_name}: Calling onChange callbacks.`);
        for (const on_change_callback of this.on_change_callbacks) {
            await on_change_callback(this, new_value, old_value);
        }
    }

    /**
     * Returns true if the CustomVariable has an assigned value.
     */
    public async isAvailable(): Promise<boolean> {
        return null !== this.value;
    }

    public getConfiguration() {
        return this.custom_variable_instance.configuration;
    }

    public getGlobalDefaultValueConfiguration(): GlobalVariableDefaultValueConfiguration | undefined {
        return this.custom_variable_instance.configuration.default_value;
    }
}

type TCustomVariableOnChangeCallback = (variable: CustomVariable, new_value: string, old_value: string) => Promise<void>;