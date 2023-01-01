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

import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {debugLog} from "../Debug";
import {
    ConfirmationModal,
    Instance,
    InstanceConfiguration,
} from "../imports";

export abstract class Model {

    public constructor(
        public readonly plugin: SC_Plugin,
    ) {}

    public abstract getSingularName(): string;

    /**
     *TODO: Change this to public and call it from Instance.constructor() and store the result in a new property Instance.parent_relation. Make other callers use the new property instead of calling this method.
     */
    protected abstract defineParentConfigurationRelation(instance: Instance): ParentModelOneToOneRelation | ParentModelOneToManyIndexRelation | ParentModelOneToManyIdRelation;

    /**
     * Creates instance objects from already existing configuration. I.e. does not create NEW instances or new configurations.
     */
    public abstract loadInstances(parent_instance_or_configuration: Instance | InstanceConfiguration): Set<Instance> | Map<string, Instance>;

    /**
     * Creates a new instance and adds its configuration to the parent configuration.
     */
    public abstract newInstance(parent_instance_or_configuration: Instance | InstanceConfiguration): Instance;

    public abstract getDefaultConfiguration(): InstanceConfiguration;

    public createSettingFields(instance: Instance, parent_element: HTMLElement, with_deletion = true) {
        debugLog(this.constructor.name + ": Creating setting fields.");

        // Create a container
        const setting_fields_container = parent_element.createDiv(); // Create a nested container that can be easily deleted if the instance is deleted.

        const main_setting_field = this._createSettingFields(instance, setting_fields_container);
        if (with_deletion) {
            main_setting_field.addExtraButton(button => button
                .setIcon("trash")
                .setTooltip("Delete this " + this.getSingularName().toLocaleLowerCase())
                .onClick(() => {
                    // The trash icon has been clicked
                    // Open up a modal asking for confirmation if the instance can be deleted from this.parent_configuration.
                    const confirmation_modal = new ConfirmationModal(
                        this.plugin,
                        "Delete " + this.getSingularName().toLocaleLowerCase() + ": " + instance.getTitle(),
                        "Are you sure you want to delete this " + this.getSingularName().toLocaleLowerCase() + "?",
                        "Yes, delete",
                    );
                    confirmation_modal.open();
                    confirmation_modal.promise.then(async (deletion_confirmed: boolean) => {
                        if (deletion_confirmed) {
                            // User has confirmed the deletion.
                            // Delete the configuration and remove the instance from custom collections.
                            this.deleteInstance(instance);

                            // Delete setting fields.
                            setting_fields_container.remove();

                            // Save settings
                            await this.plugin.saveSettings();
                        }
                    });
                }),
            );
        }
        return main_setting_field;
    }

    /**
     * Creates setting fields into the given container_element, and then returns the main Setting that
     * can be used for injecting a deleting button into.
     *
     * @param instance
     * @param container_element
     * @protected
     */
    protected abstract _createSettingFields(instance: Instance, container_element: HTMLElement): Setting;

    /**
     * Deletes the instance from configuration, and calls _deleteChild() which will delete the instance from custom collections.
     *
     * Can be made public if needed.
     */
    public deleteInstance(instance: Instance) {
        debugLog(this.constructor.name + ": Deleting an instance.");
        this._deleteInstance(instance);
        const relation = this.defineParentConfigurationRelation(instance);
        switch (relation.type) {
            // case "one-to-one": // TODO: Uncomment when first model that needs this is implemented.
                // This is a relation where 'key' points directly to the instance's configuration.
                // delete this.parent_configuration[this.relation.key];
                // break;
            case "one-to-many-index": {
                // This is a relation where 'key' points to an indexed array of instance configurations. Use 'index' to pick the correct instance configuration.
                instance.parent_configuration[relation.key].splice(relation.index, 1); // Do not use delete, as it would place null in the list.
                break;
            } case "one-to-many-id": {
                // This is a relation where 'key' points to an indexed array of instance configurations. Use 'id' to determine the correct index.
                const index = this.idToIndex(instance.parent_configuration[relation.key], relation.id);
                if (null === index) {
                    // Something went wrong
                    throw new Error(`${this.constructor.name}.deleteInstance(): Could not find an index for id ${relation.id}.`);
                }
                instance.parent_configuration[relation.key].splice(index, 1); // Do not use delete, as it would place null in the list.
                break;
			}
        }
    }

    private idToIndex(configurations: InstanceConfiguration[], id: string): number | null {
        let result_index = null;
        configurations.forEach((instance_configuration: InstanceConfiguration, index) => {
            if (instance_configuration.id === id) {
                // This is the correct configuration.
                result_index = index;
            }
        });
        return result_index;
    }

    /**
     * This should delete the instance from custom collections. It should be overridden by all Instance classes that have deletable children.
     */
    protected _deleteInstance(instance: Instance) {
        throw new Error(this.constructor.name + ".deleteInstance(): This class does not override _deleteInstance() method. Maybe the class is not supposed to have children?");
    }

    public abstract validateValue(instance: Instance, field: string, value: unknown): Promise<void>;

}

/**
 * @abstract This interface should not be used directly. Use one of the child interfaces instead.
 */
interface ParentModelRelation {
    type: "one-to-one" | "one-to-many-index" | "one-to-many-id";
    key: string;
}

export interface ParentModelOneToOneRelation extends ParentModelRelation {
    type: "one-to-one";
}

export interface ParentModelOneToManyIndexRelation extends ParentModelRelation {
    type: "one-to-many-index";
    index: number; // TODO: Find a way to use something like: keyof InstanceConfiguration[this["key"]] . 'keyof' needs to be replaced with something suitable for a numeric index of an array. 'keyof' is only applicable for objects.
}

export interface ParentModelOneToManyIdRelation extends ParentModelRelation {
    type: "one-to-many-id";
    id: string;
}


// Model class collection

const model_classes: Map<string, Model> = new Map();

export function introduceModelClass(model_class: Model) {
    model_classes.set(model_class.constructor.name, model_class);
}

export function getModel<ModelClass>(model_class_name: string): ModelClass  {
    return model_classes.get(model_class_name) as unknown as ModelClass;
}