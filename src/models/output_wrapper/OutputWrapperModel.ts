/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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

import {
    Model,
    ParentModelOneToManyIdRelation,
} from "../Model";
import {Setting} from "obsidian";
import {
    OutputWrapper,
    OutputWrapperConfiguration,
} from "./OutputWrapper";
import {debugLog} from "../../Debug";
import {getIDGenerator} from "../../IDGenerator";
import {OutputStream} from "../../output_channels/OutputHandlerCode";
import {OutputWrapperSettingsModal} from "./OutputWrapperSettingsModal";
import {SC_MainSettings} from "../../settings/SC_MainSettings";

export class OutputWrapperModel extends Model {

    private output_wrappers = new OutputWrapperMap();

    protected _createSettingFields(output_wrapper: OutputWrapper, container_element: HTMLElement): Setting {
        debugLog("Creating setting fields for an OutputWrapper instance.");
        const output_wrapper_name_setting = new Setting(container_element)
            // Configuration button
            .setName(output_wrapper.getTitle())
            .addExtraButton(button => button
                .setTooltip("Define output wrapper content")
                .setIcon("gear")
                .onClick(() => {
                    this.openSettingsModal(output_wrapper, output_wrapper_name_setting);
                }),
            )
        ;
        return output_wrapper_name_setting;
    }

    protected defineParentConfigurationRelation(output_wrapper: OutputWrapper): ParentModelOneToManyIdRelation {
        return {
            type: "one-to-many-id",
            key: "output_wrappers",
            id: output_wrapper.getID(),
        };
    }

    public static getSingularName(): string {
        return "Output wrapper";
    }

    public loadInstances(parent_configuration: SC_MainSettings): OutputWrapperMap {
        debugLog("Loading OutputWrapper instances.");
        this.output_wrappers = new OutputWrapperMap();
        parent_configuration.output_wrappers.forEach((output_wrapper_configuration: OutputWrapperConfiguration) => {
            const output_wrapper = new OutputWrapper(this, this.plugin, output_wrapper_configuration, parent_configuration);
            this.output_wrappers.set(output_wrapper_configuration.id, output_wrapper);
        });
        return this.output_wrappers;
    }

    public newInstance(parent_configuration: SC_MainSettings): OutputWrapper {
        debugLog("Creating a new OutputWrapper instance.");
        // TODO: Move this logic to the base Model class.

        // Setup a default configuration and generate an ID
        const output_wrapper_configuration = this.getDefaultConfiguration();

        // Instantiate an OutputWrapper
        const output_wrapper = new OutputWrapper(this, this.plugin, output_wrapper_configuration, this.plugin.settings);
        this.output_wrappers.set(output_wrapper.getID(), output_wrapper);

        // Store the configuration into plugin's settings
        parent_configuration.output_wrappers.push(output_wrapper_configuration);

        // Return the OutputWrapper
        return output_wrapper;
    }

    public validateValue(output_wrapper: OutputWrapper, field: string, value: unknown): Promise<void> {
        // No validation is needed, I guess. 'Title' and 'content' can both be empty, although an empty title does not make sense.
        return Promise.resolve(undefined);
    }

    public openSettingsModal(output_wrapper: OutputWrapper, output_wrapper_name_setting: Setting) {
        debugLog("Opening settings modal for an OutputWrapper instance.");
        const modal = new OutputWrapperSettingsModal(this.plugin, output_wrapper, output_wrapper_name_setting);
        modal.open();
    }

    public getDefaultConfiguration(): OutputWrapperConfiguration {
        return {
            id: getIDGenerator().generateID(),
            title: "",
            content: "",
        };
    }

    protected _deleteInstance(deletable_output_wrapper: OutputWrapper): void {
        debugLog("Deleting an OutputWrapper instance.");

        // Remove the OutputWrapper from all TShellCommands that use it.
        const shell_commands = this.plugin.getTShellCommands();
        for (const shell_command_id in shell_commands) {
            const t_shell_command = shell_commands[shell_command_id];
            const output_wrappers = t_shell_command.getConfiguration().output_wrappers;
            Object.each(output_wrappers, (output_wrapper_id: string, output_stream: OutputStream) => {
                if (output_wrapper_id === deletable_output_wrapper.getID()) {
                    // A shell command uses the output wrapper that is about to be deleted.
                    // Configure the shell command not to use any output wrapper.
                    output_wrappers[output_stream] = null;
                }
            });
        }

        // Remove the OutputWrapper from this class's internal list.
        this.output_wrappers.delete(deletable_output_wrapper.getID());
    }

}

export class OutputWrapperMap extends Map<string, OutputWrapper> {}