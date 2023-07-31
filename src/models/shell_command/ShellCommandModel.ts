/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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
} from "../../Imports";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {Setting} from "obsidian";
import {
    newShellCommandConfiguration,
    ShellCommandConfiguration,
} from "../../settings/ShellCommandConfiguration";
import {createShellCommandField} from "../../settings/setting_elements/CreateShellCommandField";
import {SC_MainSettingsTab} from "../../settings/SC_MainSettingsTab";
import {debugLog} from "../../Debug";
import {
    TShellCommand,
    TShellCommandMap,
} from "./TShellCommand";

export class ShellCommandModel extends Model {
    
    private shellCommands: TShellCommandMap;
    
    public static getSingularName(): string {
        return "Shell command";
    }
    
    protected defineParentConfigurationRelation(shellCommand: TShellCommand): ParentModelOneToManyIdRelation {
        return {
            type: "one-to-many-id",
            key: "shell_commands",
            id: shellCommand.getId(),
        };
    }
    
    public loadInstances(parentConfiguration: SC_MainSettings): TShellCommandMap {
        debugLog("Loading Shell command instances.");
        this.shellCommands = new TShellCommandMap();
        for (const shellCommandConfiguration of parentConfiguration.shell_commands) {
            this.shellCommands.set(
                shellCommandConfiguration.id,
                new TShellCommand(
                    this,
                    shellCommandConfiguration,
                    parentConfiguration,
                ),
            );
        }
        return this.shellCommands;
    }
    
    public newInstance(parentConfiguration: SC_MainSettings): TShellCommand {
        debugLog("Creating a new Shell command instance.");
        // TODO: Move this logic to the base Model class.
        
        // Setup a default configuration and generate an ID
        const shellCommandConfiguration = this.getDefaultConfiguration();
        
        // Instantiate a ShellCommand.
        const shellCommand: TShellCommand = new TShellCommand(this, shellCommandConfiguration, parentConfiguration);
        this.shellCommands.set(shellCommand.getId(), shellCommand);
        
        // Store the configuration into plugin's settings
        this.plugin.settings.shell_commands.push(shellCommandConfiguration);
        
        // Return the Prompt
        return shellCommand;
    }
    
    public getDefaultConfiguration(): ShellCommandConfiguration {
        return newShellCommandConfiguration();
    }
    
    protected _createSettingFields(
        shellCommand: TShellCommand,
        containerElement: HTMLElement,
        extraArguments: {
            settingsTab: SC_MainSettingsTab,
            onAfterPreviewGenerated: () => void,
        },
    ): Setting {
        return createShellCommandField(
            this.plugin,
            containerElement,
            extraArguments.settingsTab,
            shellCommand,
            this.plugin.settings.show_autocomplete_menu,
            () => extraArguments.onAfterPreviewGenerated(),
        ).name_setting;
    }
    
    public validateValue(instance: TShellCommand, field: string, value: unknown): Promise<void> {
        // This method is not used, so it can just resolve all the time.
        return Promise.resolve(undefined);
    }
    
    protected _deleteInstance(shellCommand: TShellCommand): void {
        // Unregister possible events in order to prevent them becoming ghosts that just keep executing even after removing the configuration.
        shellCommand.unregisterSC_Events();
        
        this.shellCommands.delete(shellCommand.getId());
    }
    
}