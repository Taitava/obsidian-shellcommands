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
    GlobalVariableDefaultValueConfiguration,
    Variable,
} from "./Variable";
import SC_Plugin from "../main";
import {CustomVariableInstance} from "../models/custom_variable/CustomVariableInstance";
import {resetVariableAutocompleteItems} from "./getVariableAutocompleteItems";
import {debugLog} from "../Debug";
import {cloakPassword} from "../Common";
import {EOL} from "os";

/**
 * This class serves as the actual operational variable class for custom variables. It's paired with the CustomVariableInstance class, which acts
 * as a configuration class to handle settings together with CustomVariableModel class.
 */
export class CustomVariable extends Variable {

    private value: string | null = null; // TODO: When implementing variable types, make this class abstract and let subclasses define the type of this property.

    protected always_available = false;
    
    /**
     * If the variable's value comes from a password field, it is marked to be cloaked in CustomVariableView.
     *
     * Even though passwords are also cloaked in Prompt previews, it's not triggered by this property.
     *
     * @private
     */
    private cloak: boolean = false;

    constructor(
        plugin: SC_Plugin,
        private custom_variable_instance: CustomVariableInstance
    ) {
        super(plugin);
        this.updateProperties();
        debugLog(`Loaded CustomVariable ${this.variable_name}.`);
    }

    public async generateValue(): Promise<string> {
        if (null === this.value) {
            debugLog(`Custom variable ${this.variable_name} does not have a value yet, and no default value is defined.`);
            this.throw("This custom variable does not have a value yet, and no default value is defined.");
        }
        return this.value;
    }
    
    /**
     * Tells whether this CustomVariable has an actual value, NOT falling back to any possible default value.
     */
    public hasOwnValue() {
        return null !== this.value;
    }

    /**
     * A simpler way to access the value than Variable.getValue(). Both methods can return the value, but Variable.getValue()
     * would require providing a Shell object (which would not be even used because CustomVariables do not need it) and
     * it would return a VariableValueResult object.
     *
     * @return null if not value is yet set for this CustomVariable, or a string otherwise.
     */
    public getCustomVariableValue(): string | null  {
        return this.value;
    }
    
    public shouldCloak(): boolean {
        return this.cloak;
    }

    /**
     * TODO: Make it possible to prevent calling onChange callbacks:
     *  - Make it possible to call the callbacks later outside this class.
     *  - This makes it possible to prevent unnecessary CustomVariableView updates when multiple CustomVariables are assigned values in one go (via Shell command URI).
     *  - Store the old value into some kind of history list.
     *  - When calling the callbacks, the current CustomVariable should be passed as a parameter instead of the 'value' and 'old_value' parameters (which can be accessed via the CustomVariable object).
     *
     * @param value
     * @param source
     * @param cloak This should be true, if the value is a password.
     */
    public async setValue(value: string, source: "manual" | "uri" | "output", cloak: boolean = false) {
        const old_value = this.value;
        debugLog(`CustomVariable ${this.variable_name}: Setting value to: ${value} (old was: ${old_value}).`);
        this.value = value;
        this.cloak = cloak;
        
        // Display notifications, if applicable.
        this.notifyChange(source);

        // Call the onChange hook.
        await this.callOnChangeCallbacks(value, old_value ?? ""); // Use "" if old_value is null.
    }
    
    /**
     * Shows a notification balloon after the CustomVariable's value has changed, but only if enabled by settings.
     *
     * @param {string} source - The source of the change: "manual", "uri", or "output".
     * @return {void}
     * @throws {Error} If the CustomVariable value is null after a change.
     */
    private notifyChange(source: "manual" | "uri" | "output"): void {
        let doNotify: boolean;
        switch (source) {
            case "manual":
                // Never notify about changes that user has made manually, e.g. changes from Prompts.
                doNotify = false;
                break;
            case "uri":
                // Obsidian URI / Shell commands URI.
                doNotify = this.plugin.settings.custom_variables_notify_changes_via.obsidian_uri;
                break;
            case "output":
                // OutputChannel_AssignCustomVariables.
                doNotify = this.plugin.settings.custom_variables_notify_changes_via.output_assignment;
                break;
        }
        if (doNotify) {
            if (this.value === null) {
                throw new Error("CustomVariable value is null after a change.");
            }
            const displayValue: string = this.cloak ? cloakPassword(this.value) : this.value;
            this.plugin.newNotification(this.getFullName() + " =" + EOL + displayValue);
        }
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

    public getConfiguration() {
        return this.custom_variable_instance.configuration;
    }

    public getGlobalDefaultValueConfiguration(): GlobalVariableDefaultValueConfiguration | null {
        return this.custom_variable_instance.configuration.default_value;
    }
    
    public getCustomVariableInstance(): CustomVariableInstance {
        return this.custom_variable_instance;
    }
    
    public static getCustomVariableValidNameRegex(precedingUnderscore: boolean): RegExp {
        if (precedingUnderscore) {
            return /^_[\w\d]+$/u;
        } else {
            return /^[\w\d]+$/u;
        }
    }
}

type TCustomVariableOnChangeCallback = (variable: CustomVariable, new_value: string, old_value: string) => Promise<void>;