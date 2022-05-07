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

import {debugLog} from "../Debug";
import {
    Model
} from "../imports";

export abstract class Instance {

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

    public setIfValid(field: string, value: unknown): Promise<void> {
        return this.model.validateValue(this, field, value).then(() => {
            this.configuration[field] = value;
        });
    }

}

export interface InstanceConfiguration {
    [key: string]: any;
}