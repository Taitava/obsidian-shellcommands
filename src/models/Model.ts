import SC_Plugin from "../main";
import {Setting} from "obsidian";

export abstract class Model<ModelConfiguration, ParentModelConfiguration> {

    protected abstract readonly model_singular_name: string;

    /**
     * A key used to find this model's configuration in the host's configuration.
     * @protected
     */
    protected readonly parent_configuration_relation: ParentModelOneToOneRelation<ParentModelConfiguration> | ParentModelOneToManyRelation<ParentModelConfiguration>;

    public constructor(
        protected readonly plugin: SC_Plugin,
        protected readonly configuration: ModelConfiguration,
        protected readonly parent_configuration: ParentModelConfiguration,
    ) {
        this.parent_configuration_relation = this.defineParentConfigurationRelation();
    }

    protected abstract defineParentConfigurationRelation(): ParentModelOneToOneRelation<ParentModelConfiguration> | ParentModelOneToManyRelation<ParentModelConfiguration>;

    public delete() {
        switch (this.parent_configuration_relation.type) {
            // case "one-to-one": // TODO: Uncomment when first model that needs this is implemented.
                // This is a relation where 'key' points directly to the instance's configuration.
                // delete this.parent_configuration[this.parent_configuration_relation.key];
                // break;
            case "one-to-many":
                // This is a relation where 'key' points to an indexed array of instance configurations. Use 'index' to pick the correct instance configuration.
                delete this.parent_configuration[this.parent_configuration_relation.key][this.parent_configuration_relation.index as keyof {}]; // TODO: Find out a way to avoid using 'keyof {}'.
                break;
        }
    }

    public createSettingFields(container_element: HTMLElement) {
        const main_setting_field = this._createSettingFields(container_element);
        main_setting_field.addExtraButton(button => button
            .setIcon("trash")
            .setTooltip("Delete this " + this.model_singular_name.toLocaleLowerCase())
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
     * @param container_element
     * @protected
     */
    protected abstract _createSettingFields(container_element: HTMLElement): Setting;

}

/**
 * @abstract This interface should not be used directly. Use one of the child interfaces instead.
 */
interface ParentModelRelation<ParentModelConfiguration> {
    type: "one-to-one" | "one-to-many";
    key: keyof ParentModelConfiguration;
}

export interface ParentModelOneToOneRelation<ParentModelConfiguration> extends ParentModelRelation<ParentModelConfiguration> {
    type: "one-to-one";
}

export interface ParentModelOneToManyRelation<ParentModelConfiguration> extends ParentModelRelation<ParentModelConfiguration>{
    type: "one-to-many";
    index: number; // TODO: Find a way to use something like: keyof ParentModelConfiguration[this["key"]] . 'keyof' needs to be replaced with something suitable for a numeric index of an array. 'keyof' is only applicable for objects.
}