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

import {Instance} from "../Instance";
import {
    CustomShellConfiguration,
    CustomShellModel,
} from "./CustomShellModel";
import {
    IPlatformSpecificString,
    PlatformId,
    PlatformNamesMap,
    SC_MainSettings,
} from "../../settings/SC_MainSettings";
import {getIDGenerator} from "../../IDGenerator";
import {debugLog} from "../../Debug";
import {CustomShell} from "../../shells/CustomShell";
import {Shell} from "../../shells/Shell";
import {registerShell} from "../../shells/ShellFunctions";
import {
    TShellCommand,
    TShellCommandMap,
} from "../../TShellCommand";
import {ensureObjectHasProperties} from "../../Common";

export class CustomShellInstance extends Instance {
    public readonly parent_configuration: SC_MainSettings;
    public configuration: CustomShellConfiguration;
    private customShell: CustomShell;

    constructor(
        public readonly model: CustomShellModel,
        configuration: CustomShellConfiguration,
        parent_configuration: SC_MainSettings,
    ) {
        super(model, configuration, parent_configuration);

        // Introduce the ID to an ID generator so that it won't accidentally generate the same ID again when creating new CustomShellInstances.
        getIDGenerator().addReservedID(configuration.id);

        // Create an operative shell.
        this.createCustomShell();

        debugLog(`Loaded CustomShellInstance ${this.getId()}.`);
    }

    public getId(): string {
        return this.configuration.id;
    }

    public getTitle(): string {
        return this.configuration.name;
    }

    private createCustomShell(): Shell {
        debugLog(`CustomShellInstance ${this.getId()}: Creating an operational CustomShell.`);
        this.customShell = new CustomShell(this.model.plugin, this);
        registerShell(this.customShell);
        return this.customShell;
    }

    public getCustomShell(): CustomShell {
        return this.customShell;
    }

    /**
     * Returns all TShellCommands that currently use this custom shell on the given platform.
     *
     * TODO: Consider moving this method to Shell.
     *
     * @private Can be made public, if needed.
     */
    private getTShellCommandsByPlatform(platformId: PlatformId): TShellCommandMap {
        return new TShellCommandMap(Array.from(this.model.plugin.getTShellCommandsAsMap()).filter((entry: [string, TShellCommand]) => {
            const tShellCommand: TShellCommand = entry[1];
            return tShellCommand.getShells()[platformId] === this.getId();
        }));
    }

    /**
     * Returns all TShellCommands that currently use this CustomShell on any platform.
     *
     * TODO: Consider moving this method to Shell.
     *
     * @private Can be made public, if needed.
     */
    private getTShellCommands(): TShellCommandMap {
        return new TShellCommandMap(Array.from(this.model.plugin.getTShellCommandsAsMap()).filter((entry: [string, TShellCommand]) => {
            const tShellCommand: TShellCommand = entry[1];
            return tShellCommand.getShellIdentifiersAsSet().has(this.getId());
        }));
    }

    /**
     * Returns a list of operating system ids that are configured to use this shell as their default shell.
     *
     * TODO: Consider moving this method to Shell.
     *
     * @private Can be made public, if needed.
     */
    public getPlatformIdsUsingThisShellAsDefault() {
        const platformIdsUsingThisShell: PlatformId[] = [];
        const defaultShells: IPlatformSpecificString = this.model.plugin.settings.default_shells;
        for (const platformId of Object.getOwnPropertyNames(defaultShells) as PlatformId[]) {
            if (defaultShells[platformId] === this.getId()) {
                platformIdsUsingThisShell.push(platformId);
            }
        }
        return platformIdsUsingThisShell;
    }

    /**
     * Marks the given host operating system as enabled in CustomShellConfiguration.
     *
     * Note that the caller should save plugin settings, it's not done by this method.
     *
     * @param newPlatformId
     */
    public changeHostPlatformIfCan(newPlatformId: PlatformId): true | string {

        const usages: string[] = this.getUsages();
        if (usages.length > 0) {
            // Cannot change the host platform because there are usages.
            return usages.join(", ");
        } else {
            // Can change the host platform.
            this.configuration.host_platform = newPlatformId;

            // Ensure the host platform configuration contains all properties a default configuration contains. However,
            // default values MUST NOT override any possibly existing values.
            switch (newPlatformId) {
                case "win32":
                    ensureObjectHasProperties(
                        this.configuration.host_platform_configurations,
                        {win32: CustomShellModel.getDefaultHostPlatformWindowsConfiguration()},
                    );
                    break;
            }
            return true;
        }
    }

    /**
     * Returns a human-readable list of shell commands using this Shell, and platforms where this is a default Shell.
     *
     * @param platformId Optional, can be used to narrow the list of shell commands to only those using this Shell on a specific platform.
     */
    public getUsages(platformId?: PlatformId): string[] {
        const usedByTShellCommands = platformId ? this.getTShellCommandsByPlatform(platformId) : this.getTShellCommands();
        const usedByPlatformDefaults = (undefined === platformId)
            ? this.getPlatformIdsUsingThisShellAsDefault()
            : this.getPlatformIdsUsingThisShellAsDefault().filter(_platformId => _platformId === platformId) // if platformId is present, the list will contain zero or one item.
        ;
        const usages: string[] = [];

        if (usedByTShellCommands.size > 0) {
            usages.push(...Array.from(usedByTShellCommands.values()).map((tShellCommand: TShellCommand) => "by " + tShellCommand.getAliasOrShellCommand()));
        }

        if (usedByPlatformDefaults.length > 0) {
            usages.push(...usedByPlatformDefaults.map(platformId => "as a default shell for " + PlatformNamesMap.get(platformId)));
        }

        return usages;
    }
}