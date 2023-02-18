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
    PlatformId,
    SC_MainSettings,
} from "../../settings/SC_MainSettings";
import {getIDGenerator} from "../../IDGenerator";
import {debugLog} from "../../Debug";
import {CustomShell} from "../../shells/CustomShell";
import {Shell} from "../../shells/Shell";
import {registerShell} from "../../shells/ShellFunctions";
import {TShellCommand} from "../../TShellCommand";

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
     */
    public getTShellCommandsByPlatform(platformId: PlatformId): Map<string, TShellCommand> {
        return new Map<string, TShellCommand>(Array.from(this.model.plugin.getTShellCommandsAsMap()).filter((entry: [string, TShellCommand]) => {
            const tShellCommand: TShellCommand = entry[1];
            return tShellCommand.getShells()[platformId] === this.getId();
        }));
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
    }

    /**
     * Marks the given host operating system as disabled in CustomShellConfiguration.
     *
     * Note that the caller should save plugin settings, it's not done by this method.
     *
     * @param platformId
     */
    public disableHostPlatform(platformId: PlatformId): void {
        this.configuration.host_platforms[platformId].enabled = false;
    }
}