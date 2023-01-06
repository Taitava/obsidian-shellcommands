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

import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {
    CustomVariable,
    CustomVariableConfiguration,
    CustomVariableModel,
    getIDGenerator,
    Instance,
} from "../../imports";
import {debugLog} from "../../Debug";

/**
 * This class serves as an accessor to CustomVariable configurations. It's paired with the CustomVariable class, which acts
 * as an operational class to implement the variable functionality.
 *
 * TODO: Decide a better name for this class. It's too easy to confuse with the CustomVariable class name.
 */
export class CustomVariableInstance extends Instance {
    public readonly parent_configuration: SC_MainSettings;
    public configuration: CustomVariableConfiguration;
    private custom_variable: CustomVariable | null = null;

    constructor(
        public readonly model: CustomVariableModel,
        configuration: CustomVariableConfiguration,
        parent_configuration: SC_MainSettings,
    ) {
        super(model, configuration, parent_configuration);

        // Introduce the ID to an ID generator so that it won't accidentally generate the same ID again when creating new CustomVariableInstances.
        getIDGenerator().addReservedID(configuration.id);

        debugLog(`Loaded CustomVariableInstance ${this.getID()}.`);
    }

    public getID() {
        return this.configuration.id;
    }

    public getFullName() {
        return `{{${this.getPrefixedName()}}}`;
    }

    /**
     * Adds an underscore in front of the name.
     */
    public getPrefixedName() {
        return "_" + this.configuration.name;
    }

    public getTitle(): string {
        return this.getFullName();
    }

    public getCustomVariable(): CustomVariable {
        if (!this.custom_variable) {
            debugLog(`CustomVariableInstance ${this.getID()}: Cannot find a CustomVariable. Maybe it's not loaded?`);
            throw new Error(this.constructor.name + ".getVariable(): Cannot find a CustomVariable. Maybe it's not loaded?");
        }
        return this.custom_variable;
    }

    public createCustomVariable(): CustomVariable {
        debugLog(`CustomVariableInstance ${this.getID()}: Creating an operational CustomVariable.`);
        this.custom_variable = new CustomVariable(this.model.plugin, this);
        this.custom_variable.onChange(async () => await this.model.plugin.updateCustomVariableViews());
        return this.custom_variable;
    }
}