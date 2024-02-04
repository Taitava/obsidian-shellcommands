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

import SC_Plugin from "./main";
import {newShellCommandConfiguration, ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import {debugLog} from "./Debug";
import * as fs from "fs";
import {
    combineObjects,
    getPluginAbsolutePath,
    isWindows,
} from "./Common";
import * as path from "path";
import {getDefaultSettings} from "./settings/SC_MainSettings";
import {
    CustomVariableConfiguration,
    CustomVariableModel,
} from "./models/custom_variable/CustomVariableModel";
import {getModel} from "./models/Model";
import {OutputStream} from "./output_channels/OutputHandlerCode";
import {OutputChannel} from "./output_channels/OutputChannel";
import {PromptFieldModel} from "./models/prompt/prompt_fields/PromptFieldModel";
import {PromptConfiguration} from "./models/prompt/Prompt";
import {PromptFieldConfiguration} from "./models/prompt/prompt_fields/PromptField";

export async function RunMigrations(plugin: SC_Plugin) {
    const should_save = [ // If at least one of the values is true, saving will be triggered.
        EnsureMainFieldsExist(plugin), // Do this early.
        MigrateCommandsToShellCommands(plugin),
        MigrateShellCommandsObjectToArray(plugin),
        MigrateShellCommandToPlatforms(plugin),
        MigrateShellCommandOutputChannels(plugin),
        EnsureShellCommandsHaveAllFields(plugin),
        EnsureCustomVariablesHaveAllFields(plugin),
        EnsurePromptFieldsHaveAllFields(plugin),
        DeleteEmptyCommandsField(plugin),
        MigrateDebouncingModes(plugin), // Temporary.
    ];
    if (should_save.includes(true)) {
        // Only save if there were changes to configuration.
        debugLog("Saving migrations...");
        backupSettingsFile(plugin); // Make a backup copy of the old file BEFORE writing the new, migrated settings file.
        await plugin.saveSettings();
        debugLog("Migrations saved...");
    }
}

/**
 * Temporary, only needed for migrating a debouncing `mode` property which was present in SC 0.22.0-beta.1, so not in any
 * actual release. The property is removed in 0.22.0-beta.2. Keep this function a few months, then it's not needed anymore.
 * @param plugin
 * @constructor
 */
function MigrateDebouncingModes(plugin: SC_Plugin): boolean {
    let save: boolean = false;
    for (const shellCommandConfiguration of plugin.settings.shell_commands) {
        if (shellCommandConfiguration.debounce) {
            // @ts-ignore
            if (undefined !== shellCommandConfiguration.debounce.mode) {
                // Found a `mode` property that was present in SC 0.22.0-beta.1 .
                // @ts-ignore
                switch (shellCommandConfiguration.debounce.mode) {
                    case "early-and-late-execution":
                        shellCommandConfiguration.debounce.executeEarly = true;
                        shellCommandConfiguration.debounce.executeLate = true;
                        break;
                    case "early-execution":
                        shellCommandConfiguration.debounce.executeEarly = true;
                        shellCommandConfiguration.debounce.executeLate = false;
                        break;
                    case "late-execution":
                        shellCommandConfiguration.debounce.executeEarly = false;
                        shellCommandConfiguration.debounce.executeLate = true;
                        break;
                }
                // @ts-ignore
                debugLog("Migration: Shell command #" + shellCommandConfiguration.id + " had a deprecated debounce.mode property (" + shellCommandConfiguration.debounce.mode + "). It was migrated to debounce.executeEarly (" + (shellCommandConfiguration.debounce.executeEarly ? "true" : "false") + ") and debounce.executeLate (" + (shellCommandConfiguration.debounce.executeLate ? "true" : "false") + ").");
                // @ts-ignore
                delete shellCommandConfiguration.debounce.mode;
                save = true;
            }
        }
    }
    return save;
}

/**
 * Can be removed in the future, but I haven't yet decided will it be done in 1.0 or later.
 */
function MigrateShellCommandsObjectToArray(plugin: SC_Plugin) {
    // Check if the shell commands' container is an object.
    if (!Array.isArray(plugin.settings.shell_commands)) {
        // It is an object. It needs to be changed to an array in order to allow custom ordering.
        const shell_commands_array: ShellCommandConfiguration[] = [];
        for (const shell_command_id of Object.getOwnPropertyNames(plugin.settings.shell_commands)) { // Remember that plugin.settings.shell_commands is an object here! Not an array (yet).
            // @ts-ignore I don't know why TypeScript thinks the index is incorrect.
            const shell_command_configuration: ShellCommandConfiguration = plugin.settings.shell_commands[shell_command_id];

            // Assign 'id' to ShellCommandConfiguration because it did not contain it before this migration.
            shell_command_configuration.id = shell_command_id;

            // Add the ShellCommandConfiguration to the new array container.
            shell_commands_array.push(shell_command_configuration);
        }

        // Replace the old object container with the new array container.
        plugin.settings.shell_commands = shell_commands_array; // Now plugin.settings.shell_commands changes to be an array instead of an object.

        return true; // Save the changes.
    } else {
        // The container is already migrated.
        return false; // No need to save anything.
    }
}

/**
 * Can be removed in 1.0.0.
 *
 * @param plugin
 * @constructor
 */
function MigrateCommandsToShellCommands(plugin: SC_Plugin) {
    if (undefined === plugin.settings.commands) {
        return false;
    }
    const count_shell_commands = plugin.settings.commands.length;
    let save = false;
    if (0 < count_shell_commands) {
        let count_empty_commands = 0; // A counter for empty or null commands
        debugLog("settings.commands is not empty, will migrate " + count_shell_commands + " commands to settings.shell_commands.");
        for (const shell_command_id in plugin.settings.commands) {
            const shell_command = plugin.settings.commands[shell_command_id];
            // Ensure that the command is not empty. Just in case.
            if (null === shell_command || 0 === shell_command.length) {
                // The command is empty
                debugLog("Migration failure for shell command #" + shell_command_id + ": The original shell command string is empty, so it cannot be migrated.");
                count_empty_commands++;
            }
            else if (undefined !== plugin.getShellCommandConfigurationIndex(shell_command_id)) {
                // A command with the same id already exists
                debugLog("Migration failure for shell command #" + shell_command_id + ": A shell command with same ID already exists in settings.shell_commands.");
            } else {
                // All OK, migrate.
                plugin.settings.shell_commands.push(newShellCommandConfiguration(shell_command_id, shell_command)); // Creates a shell command with default values and defines the command for it.
                delete plugin.settings.commands[shell_command_id]; // Leaves a null in place, but we can deal with it by deleting the whole array if it gets empty.
                count_empty_commands++; // Account the null generated on the previous line.
                save = true;
                debugLog("Migrated shell command #" + shell_command_id + ": " + shell_command);
            }
        }
        if (count_empty_commands === count_shell_commands) {
            // The whole commands array now contains only empty/null commands.
            // Delete it.
            delete plugin.settings.commands;
        }
    } else {
        debugLog("settings.commands is empty, so no need to migrate commands. Good thing! :)");
    }
    return save;
}

function MigrateShellCommandOutputChannels(plugin: SC_Plugin): boolean {
    let save = false;
    const shellCommandConfigurations = plugin.settings.shell_commands;
    for (const shellCommandConfiguration of shellCommandConfigurations) {
        let outputStream: OutputStream;
        // Iterate "stdout" and "stderr".
        // @ts-ignore
        if (shellCommandConfiguration.output_channels) {
            for (outputStream in shellCommandConfiguration.output_channels) {
                const outputChannel = shellCommandConfiguration.output_channels[outputStream];
                debugLog("Shell command #" + shellCommandConfiguration.id + ": Migrating output stream " + outputStream + " to use a configuration object.");
                if (!shellCommandConfiguration.output_handlers) {
                    // @ts-ignore Don't yell about the empty object, it will soon have content.
                    shellCommandConfiguration.output_handlers = {};
                }
                shellCommandConfiguration.output_handlers[outputStream] = OutputChannel.getDefaultConfiguration(outputChannel);
            }
            delete shellCommandConfiguration.output_channels;
            save = true;
        }
    }
    return save;
}

/**
 * This is a general migrator that adds new, missing properties to ShellCommandConfiguration objects. This is not tied to any specific version update, unlike MigrateCommandsToShellCommands().
 *
 * @param plugin
 * @constructor
 */
function EnsureShellCommandsHaveAllFields(plugin: SC_Plugin) {
    let save = false;
    const shell_command_default_configuration = newShellCommandConfiguration("no-id"); // Use a dummy id here, because something needs to be used. This id should never end up being used in practice.
    const shell_command_configurations = plugin.settings.shell_commands;
    for (const shell_command_configuration of shell_command_configurations) {
        for (const property_name in shell_command_default_configuration) {
            // @ts-ignore property_default_value can have (almost) whatever datatype
            const property_default_value = shell_command_default_configuration[property_name];
            // @ts-ignore
            if (undefined === shell_command_configuration[property_name] && property_name !== "id") { // The "id" check is just in case that MigrateShellCommandsObjectToArray() would not have added the "id" property, in which case the dummy "no-id" id should not be accidentally assigned to the shell command.
                // This shell command does not have this property.
                // Add the property to the shell command and use a default value.
                debugLog("EnsureShellCommandsHaveAllFields(): Shell command #" + shell_command_configuration.id + " does not have a property '" + property_name + "'. Will create the property and assign a default value '" + property_default_value + "'.");
                // @ts-ignore
                shell_command_configuration[property_name] = property_default_value;
                save = true;
            }
        }
    }
    return save;
}

function EnsureCustomVariablesHaveAllFields(plugin: SC_Plugin) {
    let save = false;
    const customVariableModel = getModel<CustomVariableModel>(CustomVariableModel.name);
    const customVariableDefaultConfiguration: CustomVariableConfiguration = customVariableModel.getDefaultConfiguration();
    let customVariableConfiguration: CustomVariableConfiguration;
    for (customVariableConfiguration of plugin.settings.custom_variables) {
        for (const propertyName in customVariableDefaultConfiguration) {
            // @ts-ignore propertyDefaultValue can have (almost) whatever datatype
            const propertyDefaultValue = customVariableDefaultConfiguration[propertyName];
            // @ts-ignore
            if (undefined === customVariableConfiguration[propertyName]) {
                // This custom variable does not have this property.
                // Add the property to it and use a default value.
                debugLog("EnsureCustomVariablesHaveAllFields(): Custom variable #" + customVariableConfiguration.id + " does not have a property '" + propertyName + "'. Will create the property and assign a default value '" + propertyDefaultValue + "'.");
                // @ts-ignore
                customVariableConfiguration[propertyName] = propertyDefaultValue;
                save = true;
            }
        }
    }
    return save;
}

function EnsurePromptFieldsHaveAllFields(plugin: SC_Plugin) {
    let save = false;
    const promptFieldModel = getModel<PromptFieldModel>(PromptFieldModel.name);
    let promptConfiguration: PromptConfiguration;
    for (promptConfiguration of plugin.settings.prompts) {
        let promptFieldConfiguration: PromptFieldConfiguration;
        for (promptFieldConfiguration of promptConfiguration.fields) {
            const defaultPromptFieldConfiguration = promptFieldModel.getDefaultConfiguration(
                promptFieldConfiguration.type ?? "single-line-text" // SC versions < 0.21.0 did not define 'type' property for prompt field configurations.
            );
            for (const propertyName in defaultPromptFieldConfiguration) {
                // @ts-ignore propertyDefaultValue can have (almost) whatever datatype
                const propertyDefaultValue = defaultPromptFieldConfiguration[propertyName];
                // @ts-ignore
                if (undefined === promptFieldConfiguration[propertyName]) {
                    // This PromptField does not have this property.
                    debugLog("EnsurePromptFieldsHaveAllFields(): PromptField '" + promptFieldConfiguration.label + "' does not have a property '" + propertyName + "'. Will create the property and assign a default value '" + propertyDefaultValue + "'.");
                    // @ts-ignore
                    promptFieldConfiguration[propertyName] = propertyDefaultValue;
                    save = true;
                }
            }
        }
    }
    return save;
}

/**
 * This is a general migrator that adds new, missing properties to the main settings object. This is not tied to any specific version update, unlike MigrateCommandsToShellCommands().
 *
 * @param plugin
 * @constructor
 */
function EnsureMainFieldsExist(plugin: SC_Plugin) {
    let has_missing_fields = false;
    const settings = plugin.settings;
    const default_settings = getDefaultSettings(false);
    for (const property_name in default_settings) {
        // @ts-ignore
        if (undefined === settings[property_name]) {
            // The settings object does not have this property.
            // @ts-ignore property_default_value can have (almost) whatever datatype
            const property_default_value = default_settings[property_name];
            debugLog("EnsureMainFieldsExist(): Main settings does not have property '" + property_name + "'. Will later create the property and assign a default value '" + property_default_value + "'.");
            has_missing_fields = true;
        }
    }

    if (has_missing_fields) {
        debugLog("EnsureMainFieldsExist(): Doing the above-mentioned new field creations...");
        plugin.settings = combineObjects(default_settings, plugin.settings);
        debugLog("EnsureMainFieldsExist(): Done.");
        return true; // Save the changes
    }

    debugLog("EnsureMainFieldsExist(): No new fields to create, all ok.");
    return false; // Nothing to save.
}

/**
 * Can be removed in 1.0.0.
 *
 * @param plugin
 * @constructor
 */
function MigrateShellCommandToPlatforms(plugin: SC_Plugin) {
    let save = false;
    for (const shell_command_configuration of plugin.settings.shell_commands) {
        if (undefined !== shell_command_configuration.shell_command) {
            // The shell command should be migrated.
            if (undefined === shell_command_configuration.platform_specific_commands || shell_command_configuration.platform_specific_commands.default === "") {
                debugLog("Migrating shell command #" + shell_command_configuration.id + ": shell_command string will be moved to platforms.default: " + shell_command_configuration.shell_command);
                shell_command_configuration.platform_specific_commands = {
                    default: shell_command_configuration.shell_command,
                };
                delete shell_command_configuration.shell_command;
                save = true;
            } else {
                debugLog("Migration failure for shell command #" + shell_command_configuration.id + ": platforms exists already.");
            }
        }
    }
    return save;
}

/**
 * Can be removed in 1.0.0.
 *
 * @param plugin
 * @constructor
 */
function DeleteEmptyCommandsField(plugin: SC_Plugin) {
    let save = false;
    if (undefined !== plugin.settings.commands) {
        if (plugin.settings.commands.length === 0) {
            delete plugin.settings.commands;
            save = true;
        }
    }
    return save;
}

/**
 * Permanent, do not remove.
 *
 * @param plugin
 */
function backupSettingsFile(plugin: SC_Plugin) {
    // plugin.app.fileManager.
    // @ts-ignore
    const current_settings_version = (plugin.settings.settings_version === "prior-to-0.7.0") ? "0.x" : plugin.settings.settings_version;
    const plugin_path = getPluginAbsolutePath(plugin, isWindows());
    const settings_file_path = path.join(plugin_path, "data.json");
    const backup_file_path_without_extension = path.join(plugin_path, "data-backup-version-" + current_settings_version + "-before-upgrading-to-" + SC_Plugin.SettingsVersion);

    // Check that the current settings file can be found.
    if (!fs.existsSync(settings_file_path)) {
        // Not found. Probably the vault uses a different config folder than .obsidian.
        debugLog("backupSettingsFile(): Cannot find data.json");
        plugin.newError("Shell commands: Cannot create a backup of current settings file, because data.json is not found.");
        return;
    }

    let backup_file_path = backup_file_path_without_extension + ".json";
    let running_number = 1;
    while (fs.existsSync(backup_file_path)) {
        running_number++; // The first number will be 2.
        backup_file_path = backup_file_path_without_extension + "-" + running_number + ".json";
        if (running_number >= 1000) {
            // There is some problem with detecting existing/inexisting files.
            // Prevent hanging the program in an eternal loop.
            throw new Error("backupSettingsFile(): Eternal loop detected.");
        }
    }
    fs.copyFileSync(settings_file_path, backup_file_path);
}

// TODO: Add migration: shell command variable_default_values: if type is "show-errors", change it to "inherit", but only if old settings version was below 18.