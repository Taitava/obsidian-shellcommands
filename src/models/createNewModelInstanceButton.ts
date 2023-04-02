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
    getModel,
    Instance,
    Model,
} from "../imports";

/**
 * @param plugin
 * @param model_class_name
 * @param button_container_element
 * @param instance_container_element
 * @param parent_instance_or_configuration
 * @param onClick Gets called if a user clicks the button. Will receive the newly created instance and its main Setting field.
 */
export function createNewModelInstanceButton<
        ModelClass extends Model,
        InstanceClass extends Instance,
    >(
        plugin: SC_Plugin,
        model_class_name: string,
        button_container_element: HTMLElement,
        instance_container_element: HTMLElement,
        parent_instance_or_configuration: InstanceClass["parent_configuration"] | InstanceClass["parent_instance"],
        onClick?: (instance: InstanceClass, mainSetting: Setting) => void,
    ): void {

    debugLog("Creating a button for creating a new instance for model " + model_class_name + ".");
    const model = getModel<ModelClass>(model_class_name);
    new Setting(button_container_element)
        .addButton(button => button
            .setButtonText("New " + model.static().getSingularName().toLocaleLowerCase())
            .onClick(async () => {
                if (null === parent_instance_or_configuration) {
                    throw new Error("createNewModelInstanceButton(): Parent instance or configuration is null.");
                }
                const instance = model.newInstance(parent_instance_or_configuration) as InstanceClass;
                const main_setting = model.createSettingFields(instance, instance_container_element);
                onClick?.(instance, main_setting);
                await plugin.saveSettings();
            }),
        )
    ;
}