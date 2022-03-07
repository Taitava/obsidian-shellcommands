import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {
    getModel,
    Instance,
    Model,
} from "../imports";

export function createNewModelInstanceButton<
        ModelClass extends Model,
        InstanceClass extends Instance,
    >(
        plugin: SC_Plugin,
        model_class_name: string,
        button_container_element: HTMLElement,
        instance_container_element: HTMLElement,
        parent_instance_or_configuration: InstanceClass["parent_configuration"] | InstanceClass["parent_instance"]
    ) {

    const model = getModel<ModelClass>(model_class_name);
    new Setting(button_container_element)
        .addButton(button => button
            .setButtonText("New " + model.getSingularName().toLocaleLowerCase())
            .onClick(async () => {
                const instance = model.newInstance(parent_instance_or_configuration);
                model.createSettingFields(instance, instance_container_element);
                await plugin.saveSettings();
            }),
        )
    ;
}