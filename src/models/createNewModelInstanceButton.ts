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

import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {debugLog} from "../Debug";
import {
    getModel,
    Instance,
    Model,
} from "../imports";

/**
 * @return Promise<InstanceClass> A promise that gets resolved if a user clicks the button. The promise is supplied with the newly created instance.
 */
export function createNewModelInstanceButton<
        ModelClass extends Model,
        InstanceClass extends Instance,
    >(
        plugin: SC_Plugin,
        model_class_name: string,
        button_container_element: HTMLElement,
        instance_container_element: HTMLElement,
        parent_instance_or_configuration: InstanceClass["parent_configuration"] | InstanceClass["parent_instance"]
    ): Promise<{instance: InstanceClass, main_setting: Setting}> {

    debugLog("Creating a button for creating a new instance for model " + model_class_name + ".");
    return new Promise((resolve_promise) => {
        const model = getModel<ModelClass>(model_class_name);
        new Setting(button_container_element)
            .addButton(button => button
                .setButtonText("New " + model.getSingularName().toLocaleLowerCase())
                .onClick(async () => {
                    const instance = model.newInstance(parent_instance_or_configuration) as InstanceClass;
                    const main_setting = model.createSettingFields(instance, instance_container_element);
                    resolve_promise({
                        "instance": instance,
                        "main_setting": main_setting,
                    });
                    await plugin.saveSettings();
                }),
            )
        ;
    });
}