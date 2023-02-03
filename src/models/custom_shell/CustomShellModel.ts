/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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
import {
    Instance,
} from "../Instance";
import {Setting} from "obsidian";
import {CustomShellInstance} from "./CustomShellInstance";
import {debugLog} from "../../Debug";
import {
    getOperatingSystem,
    isWindows,
} from "../../Common";
import {
    IPlatformSpecificString,
    PlatformId,
    SC_MainSettings,
} from "../../settings/SC_MainSettings";
import {getIDGenerator} from "../../IDGenerator";
import {CustomShellSettingsModal} from "./CustomShellSettingsModal";
import {getShells} from "../../shells/ShellFunctions";

export class CustomShellModel extends Model {

    private customShellInstances: CustomShellInstanceMap;

    public getSingularName(): string {
        return "Custom shell";
    }

    protected _createSettingFields(customShellInstance: CustomShellInstance, containerElement: HTMLElement): Setting {
        debugLog("Creating setting fields for a CustomShellInstance.");
        const nameSetting = new Setting(containerElement)
            // Configuration button
            .setName(customShellInstance.getTitle())
            .setDesc(customShellInstance.configuration.description)
            .addExtraButton(button => button
                .setTooltip("Configure binary file location, escaping, directory handling etc.")
                .setIcon("gear")
                .onClick(() => {
                    this.openSettingsModal(customShellInstance, nameSetting);
                }),
            )
        ;

        return nameSetting;
    }

    public openSettingsModal(customShellInstance: CustomShellInstance, nameSetting: Setting) {
        debugLog("Opening settings modal for a CustomShellInstance.");
        const modal = new CustomShellSettingsModal(this.plugin, customShellInstance, nameSetting);
        modal.open();
    }

    protected defineParentConfigurationRelation(customShellInstance: CustomShellInstance): ParentModelOneToManyIdRelation {
        debugLog(`CustomShellModel: Defining parent configuration relation for CustomShellInstance ${customShellInstance.getId()}.`);
        return {
            type: "one-to-many-id",
            key: "custom_shells",
            id: customShellInstance.getId(),
        };
    }

    public loadInstances(parentConfiguration: SC_MainSettings): CustomShellInstanceMap {
        debugLog(`CustomShellModel: Loading CustomShellInstances.`);
        this.customShellInstances = new CustomShellInstanceMap();

        // Iterate custom shell configurations
        let customShellConfiguration: CustomShellConfiguration;
        for (customShellConfiguration of parentConfiguration.custom_shells) {
            this.customShellInstances.set(
                customShellConfiguration.id,
                new CustomShellInstance(this, customShellConfiguration, parentConfiguration),
            );
        }

        return this.customShellInstances;
    }

    public newInstance(parentConfiguration: SC_MainSettings): Instance {
        debugLog(`CustomShellModel: Creating a new CustomShellInstance.`);

        // Create a default configuration object
        const customShellConfiguration: CustomShellConfiguration = this.getDefaultConfiguration();
        parentConfiguration.custom_shells.push(customShellConfiguration);

        // Create a CustomShellInstance for handling the configuration
        const customShellInstance: CustomShellInstance = new CustomShellInstance(this, customShellConfiguration, parentConfiguration);
        this.customShellInstances.set(customShellConfiguration.id, customShellInstance);

        return customShellInstance;
        // TODO: Move this logic to the base Model class.
    }

    public validateValue(customShellInstance: CustomShellInstance, field: string, value: unknown): Promise<void> {
        debugLog(`CustomShellModel: Validating ${field} value ${value} for CustomShellInstance ${customShellInstance.getId()}.`);
        throw new Error("This method is not implemented yet."); // TODO: Check if there's some need for validation.
        return Promise.resolve(undefined);
    }

    public getDefaultConfiguration(): CustomShellConfiguration {
        return {
            id: getIDGenerator().generateID(), // TODO: Think about should the generated id be replaced with static id derived from binary file name?
            name: "",
            description: "",
            binary_path: "",
            supported_platforms: [
                getOperatingSystem(), // Support the current OS by default, nothing else.
            ],
            escaper: isWindows() ? "PowerShell" : "UnixShell",
            directory_separator: "platform",
            path_separator: "platform",
            path_translator: null,
        };
    }

    protected _deleteInstance(customShellInstance: CustomShellInstance): void {
        debugLog(`CustomVariableModel: Deleting CustomShellInstance ${customShellInstance.getId()}.`);

        // Remove the CustomShellInstance from all ShellCommands that use it.
        const tShellCommands = this.plugin.getTShellCommands();
        for (const shellCommandId in tShellCommands) {
            const tShellCommand = tShellCommands[shellCommandId];
            const shellCommandShells: IPlatformSpecificString = tShellCommand.getConfiguration().shells;
            for (const platformId in shellCommandShells) {
                const shellIdentifier = shellCommandShells[platformId as keyof IPlatformSpecificString];
                if (customShellInstance.getId() === shellIdentifier) {
                    // This shell command uses this CustomShellInstance.
                    // Make the shell command use the default shell
                    delete shellCommandShells[platformId as keyof IPlatformSpecificString];
                    // Saving is done later, after the _deleteInstance() call.
                }
            }
        }

        // Delete CustomShell
        try {
            getShells().delete(customShellInstance.getCustomShell());
        } catch (error) {
            // If custom_variable_instance.getCustomShell() failed, no need to do anything. It just means there is no CustomShell, so there's nothing to delete.
        }

        // Delete CustomShellInstance
        this.customShellInstances.delete(customShellInstance.getId());
    }

}

export class CustomShellInstanceMap extends Map<string, CustomShellInstance> {}

export interface CustomShellConfiguration {
    id: string,

    /**
     * A human-readable name for the shell.
     */
    name: string,

    /**
     * A longer description about for which situations the shell is best suited for.
     */
    description: string,

    /**
     * Either just a file name, or a complete path to the shell's executable binary file.
     */
    binary_path: string,

    /**
     * A list of operating systems on which this shell can be used.
     */
    supported_platforms: PlatformId[],

    /**
     * What mechanism to use for escaping special characters in variable values.
     *
     * Set to null if the shell does not support any of the predefined escaping mechanisms. Null means escaping won't be
     * done at all, but it's highly discouraged!
     */
    escaper: "UnixShell" | "PowerShell" | "none",

    /**
     * All directories, e.g. current working directory and directories from file related variables, will use this character
     * between folder names.
     */
    directory_separator: "\\" | "/" | "platform",

    /**
     * Used to separate directories for the PATH environment variable.
     */
    path_separator: ":" | ";" | "platform", // Probably could support a freeform text, too.

    /**
     * A JavaScript function that receives a path working in the host operating system, and returns a path that should work
     * in this particular shell. The shell might be hosted on a sub-operating system (e.g. WSL), so the operating system
     * may be different.
     *
     * NUll can be used, if no translation is needed, i.e. when the host operating system version of paths should work
     * without modifications on this particular shell.
     *
     * Note that directory separators (i.e. / and \ ) are translated automatically, as it's so trivial to do, so custom
     * translators do not need to care about them. They receive paths where directory separators are already translated
     * based on the directory_separator property.
     */
    path_translator: string | null,
}
