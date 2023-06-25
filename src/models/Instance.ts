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

import {debugLog} from "../Debug";
import {
    Cacheable,
    Model,
    UsageContainer,
} from "../imports";
import {VariableMap} from "../variables/loadVariables";

export abstract class Instance extends Cacheable {

    /**
     * Configuration of the parent instance. E.g. if the current instance is a PromptField, then parent_configurations is a Prompt's configuration.
     * Can be trusted to always exist, unlike parent_instance.
     */
    public parent_configuration: InstanceConfiguration;

    /**
     * E.g. if the current instance is a PromptField, then parent_instance is a Prompt.
     * Only present for instances whose parent is something else than the root settings object.
     */
    public parent_instance: Instance | null;

    public constructor(
        public readonly model: Model,
        public readonly configuration: InstanceConfiguration,
        parent_instance_or_configuration: Instance | InstanceConfiguration,
    ) {
        super();
        debugLog(this.constructor.name + ": Creating a new instance.");

        // Determine parent type
        if (parent_instance_or_configuration instanceof Instance) {
            // It's an instance object
            this.parent_instance = parent_instance_or_configuration;
            this.parent_configuration = this.parent_instance.configuration;
        } else {
            // It's a configuration object.
            // No parent instance is available, so probably this is about SC_MainSettings object, as it does not have Model/Instance classes (at least yet).
            this.parent_instance = null; // It's null already, but do this just to make a statement.
            this.parent_configuration = parent_instance_or_configuration;
        }
    }

    public abstract getTitle(): string;
    
    /**
     * Returns a `VariableMap` containing all CustomVariables used by this Instance. The result is cached, and only
     * regenerated if configuration changes.
     */
    public getUsedCustomVariables(): VariableMap {
        return this.cache("getUsedCustomVariables", () => this._getUsedCustomVariables());
    }
    
    /**
     * Each Instance should return a VariableMap containing all CustomVariables that are used in any of their configuration
     * fields. If an Instance does not utilize {{variable}} parsing, it can return an
     *
     * @protected
     */
    protected abstract _getUsedCustomVariables(): VariableMap;

    public setIfValid(field: string, value: unknown): Promise<void> {
        return this.model.validateValue(this, field, value).then(() => {
            this.configuration[field] = value;
        });
    }
    
    /**
     * Returns a UsageContainer containing a list of places where this Instance is used. The result is cached, and only
     * regenerated if configuration changes.
     */
    public getUsages(): UsageContainer {
        return this.cache("getUsages", () => {
            // Check that a usage getter is defined by the subclass.
            if (this._getUsages) {
                return this._getUsages();
            } else {
                // No usage getter is defined. E.g. PromptField does not need usage tracking.
                // Return an empty UsageContainer.
                return new UsageContainer(this.getTitle()); // subjectName will not be used in practise when the UsageContainer is empty.
            }
        });
    }
    
    /**
     * @see getUsages()
     *
     * @protected
     */
    protected _getUsages?(): UsageContainer;

}

export interface InstanceConfiguration {
    [key: string]: any;
}