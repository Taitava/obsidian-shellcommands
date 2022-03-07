import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {
    ConfirmationModal,
    Instance,
    InstanceConfiguration,
} from "../imports";

export abstract class Model {

    public constructor(
        protected readonly plugin: SC_Plugin,
    ) {}

    public abstract getSingularName(): string;

    protected abstract defineParentConfigurationRelation(instance: Instance): ParentModelOneToOneRelation | ParentModelOneToManyRelation;

    /**
     * Creates instance objects from already existing configuration. I.e. does not create NEW instances or new configurations.
     * TODO: Rename this method to loadInstances().
     */
    public abstract createInstances(parent_instance_or_configuration: Instance | InstanceConfiguration): object[] | Map<string | number, Instance>; // TODO: Change so that only Map is allowed. TODO: Consider changing so that Set is also allowed, in which case remove 'number' possibility from Map.

    /**
     * Creates a new instance and adds its configuration to the parent configuration.
     */
    public abstract newInstance(parent_instance_or_configuration: Instance | InstanceConfiguration): Instance;

    /**
     *
     * @param instance
     * @param container_element Optional.
     *  - If defined, a new nested container element will be created in the given element, and the new element will be stored to instance.setting_fields_container.
     *  - If not defined, instance.setting_fields_container must already have an HTMLElement.
     */
    public createSettingFields(instance: Instance, container_element?: HTMLElement) {
        if (container_element) {
            // Create a container
            instance.setting_fields_container = container_element.createDiv(); // Create a nested container that can be easily deleted if the instance is deleted.
        } else if (!instance.setting_fields_container) {
            // No container
            throw new Error(this.constructor.name + ".createSettingFields(): instance.setting_fields_container is not set, and no parent container is passed as an argument.");
        }
        const main_setting_field = this._createSettingFields(instance, instance.setting_fields_container);
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
                confirmation_modal.promise.then(async () => {
                    // User has confirmed the deletion.
                    // Delete the configuration and remove the instance from custom collections.
                    this.deleteInstance(instance);

                    // Delete setting fields.
                    this.deleteSettingFields(instance);

                    // Save settings
                    await this.plugin.saveSettings();
                });
            }),
        );
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

    public resetSettingFields(instance: Instance) {
        if (!instance.setting_fields_container) {
            // No container
            throw new Error(this.constructor.name + ".resetSettingFields(): instance.setting_fields_container is not set. This method can only be called _after_ createSettingFields() has been called!");
        }
        instance.setting_fields_container.empty();
        this.createSettingFields(instance);
    }

    private deleteSettingFields(instance: Instance) {
        instance.setting_fields_container.remove();
    }

    /**
     * Deletes the instance from configuration, and calls _deleteChild() which will delete the instance from custom collections.
     *
     * Can be made public if needed.
     */
    public deleteInstance(instance: Instance) {
        this._deleteInstance(instance);
        const relation = this.defineParentConfigurationRelation(instance);
        switch (relation.type) {
            // case "one-to-one": // TODO: Uncomment when first model that needs this is implemented.
                // This is a relation where 'key' points directly to the instance's configuration.
                // delete this.parent_configuration[this.relation.key];
                // break;
            case "one-to-many":
                // This is a relation where 'key' points to an indexed array of instance configurations. Use 'index' to pick the correct instance configuration.
                instance.parent_configuration[relation.key].splice(relation.index, 1); // Do not use delete, as it would place null in the list.
                // delete instance.parent_configuration[relation.key][relation.index]; // TODO: This is just for trying if delete is able to affect plugin.settings too.
                break;
        }
    }

    /**
     * This should delete the instance from custom collections. It should be overridden by all Instance classes that have deletable children.
     */
    protected _deleteInstance(instance: Instance) {
        throw new Error(this.constructor.name + ".deleteInstance(): This class does not override _deleteInstance() method. Maybe the class is not supposed to have children?");
    }

}

/**
 * @abstract This interface should not be used directly. Use one of the child interfaces instead.
 */
interface ParentModelRelation {
    type: "one-to-one" | "one-to-many";
    key: string;
}

export interface ParentModelOneToOneRelation extends ParentModelRelation {
    type: "one-to-one";
}

export interface ParentModelOneToManyRelation extends ParentModelRelation{
    type: "one-to-many";
    index: number; // TODO: Find a way to use something like: keyof InstanceConfiguration[this["key"]] . 'keyof' needs to be replaced with something suitable for a numeric index of an array. 'keyof' is only applicable for objects.
}


// Model class collection

const model_classes: Map<string, Model> = new Map();

export function introduceModelClass(model_class: Model) {
    model_classes.set(model_class.constructor.name, model_class);
}

export function getModel<ModelClass>(model_class_name: string): ModelClass  {
    return model_classes.get(model_class_name) as unknown as ModelClass;
}