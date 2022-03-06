import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {Instance} from "../imports";

export abstract class Model {

    public constructor(
        protected readonly plugin: SC_Plugin,
    ) {}

    public abstract getSingularName(): string;

    protected abstract defineParentConfigurationRelation(instance: Instance): ParentModelOneToOneRelation | ParentModelOneToManyRelation;

    public delete(instance: Instance) {
        const parent_configuration_relation: ParentModelOneToOneRelation | ParentModelOneToManyRelation = this.defineParentConfigurationRelation(instance);
        switch (parent_configuration_relation.type) {
            // case "one-to-one": // TODO: Uncomment when first model that needs this is implemented.
                // This is a relation where 'key' points directly to the instance's configuration.
                // delete this.parent_configuration[this.parent_configuration_relation.key];
                // break;
            case "one-to-many":
                // This is a relation where 'key' points to an indexed array of instance configurations. Use 'index' to pick the correct instance configuration.
                delete instance.parent_configuration[parent_configuration_relation.key][parent_configuration_relation.index as keyof {}]; // TODO: Find out a way to avoid using 'keyof {}'.
                break;
        }
    }

    /**
     * Creates instance objects from already existing configuration. I.e. does not create NEW instances or new configurations.
     * TODO: Rename this method to loadInstances().
     */
    public abstract createInstances(parent_configuration: unknown): object[] | Map<string, Instance>; // TODO: Change so that only Map is allowed.

    /**
     * Creates a new instance and adds its configuration to the parent configuration.
     */
    public abstract newInstance(): Instance;

    public createSettingFields(instance: Instance, container_element: HTMLElement) {
        const main_setting_field = this._createSettingFields(instance, container_element);
        main_setting_field.addExtraButton(button => button
            .setIcon("trash")
            .setTooltip("Delete this " + this.getSingularName().toLocaleLowerCase())
            .onClick(() => {
                // The trash icon has been clicked
                // Open up a modal asking for confirmation if the instance can be delete from this.parent_configuration.
                // TODO: Create a general confirmation modal that can be fed with a question about deleting this instance and a "Yes, delete" text for a button. Use a promise to handle the actual deletion so that the deletion logic is programmed here, not in the modal.
                this.plugin.newNotification("A deletion modal is not implemented yet.");
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