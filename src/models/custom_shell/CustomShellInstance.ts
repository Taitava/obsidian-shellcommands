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
    SC_MainSettings,
} from "../../settings/SC_MainSettings";
import {getIDGenerator} from "../../IDGenerator";
import {debugLog} from "../../Debug";
import {CustomShell} from "../../shells/CustomShell";
import {Shell} from "../../shells/Shell";
import {registerShell} from "../../shells/ShellFunctions";
import {TShellCommand} from "../../TShellCommand";
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
     * @private Can be made public, if needed.
     */
    private getTShellCommandsByPlatform(platformId: PlatformId): Map<string, TShellCommand> {
        return new Map<string, TShellCommand>(Array.from(this.model.plugin.getTShellCommandsAsMap()).filter((entry: [string, TShellCommand]) => {
            const tShellCommand: TShellCommand = entry[1];
            return tShellCommand.getShells()[platformId] === this.getId();
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
     * @param platformId
     */
    public enableHostPlatform(platformId: PlatformId): void {
        this.configuration.host_platforms[platformId].enabled = true;

        // Ensure the host platform configuration contains all properties a default configuration contains. A disabled
        // platform's configuration might be condensed to only contain {enabled: false}. However, default values MUST NOT
        // override any possibly existing values.
        ensureObjectHasProperties(
            this.configuration.host_platforms[platformId],
            CustomShellModel.getDefaultHostPlatformConfiguration(platformId),
        );
    }

    /**
     * Marks the given host operating system as disabled in CustomShellConfiguration.
     *
     * Note that the caller should save plugin settings, it's not done by this method.
     *
     * @param platformId
     */
    private disableHostPlatform(platformId: PlatformId): void {
        this.configuration.host_platforms[platformId].enabled = false;

        // Do not remove additional configuration properties. Even though setting 'enabled' to false makes the additional
        // properties not to be in effect, they should be conserved, as they might have been inputted by a user and might
        // be needed if the platform is re-enabled later.
    }

    /**
     * Calls disableHostPlatform(), but only if the shell is not used by any shell command on the given platform.
     *
     * Note that the caller should save plugin settings, it's not done by this method.
     *
     * @param platformId
     * @return If disabling failed: A string containing shell command aliases (or command contents) that use this shell. If disabling succeeded: true.
     */
    public disableHostPlatformIfNotUsed(platformId: PlatformId): true | string {
        const relatedTShellCommands = this.getTShellCommandsByPlatform(platformId);
        if (relatedTShellCommands.size > 0) {
            // Cannot disable.
            const relatedTShellCommandsString: string =
                Array.from(relatedTShellCommands.values())
                .map((tShellCommand: TShellCommand) => tShellCommand.getAliasOrShellCommand())
                .join(', ')
            ;
            return relatedTShellCommandsString;
        } else {
            // Can disable.
            this.disableHostPlatform(platformId);
            return true;
        }
    }
}