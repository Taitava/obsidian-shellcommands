import * as fs from "fs";
import * as path from "path";
import {
    combineObjects,
    debugLog,
    getDefaultSettings,
    getPluginAbsolutePath,
    newShellCommandConfiguration,
    SC_Plugin,
    ShellCommandConfiguration,
} from "./imports";

export async function RunMigrations(plugin: SC_Plugin) {
    const should_save = [ // If at least one of the values is true, saving will be triggered.
        EnsureMainFieldsExist(plugin), // Do this early.
        MigrateCommandsToShellCommands(plugin),
        MigrateShellCommandToPlatforms(plugin),
        EnsureShellCommandsHaveAllFields(plugin),
        DeleteEmptyCommandsField(plugin),
    ];
    if (should_save.includes(true)) {
        // Only save if there were changes to configuration.
        debugLog("Saving migrations...")
        backupSettingsFile(plugin); // Make a backup copy of the old file BEFORE writing the new, migrated settings file.
        await plugin.saveSettings();
        debugLog("Migrations saved...")
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
            else if (undefined !== plugin.settings.shell_commands[shell_command_id]) {
                // A command with the same id already exists
                debugLog("Migration failure for shell command #" + shell_command_id + ": A shell command with same ID already exists in settings.shell_commands.");
            } else {
                // All OK, migrate.
                plugin.settings.shell_commands[shell_command_id] = newShellCommandConfiguration(shell_command); // Creates a shell command with default values and defines the command for it.
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

/**
 * This is a general migrator that adds new, missing properties to ShellCommandConfiguration objects. This is not tied to any specific version update, unlike MigrateCommandsToShellCommands().
 *
 * @param plugin
 * @constructor
 */
function EnsureShellCommandsHaveAllFields(plugin: SC_Plugin) {
    let save = false;
    const shell_command_default_configuration = newShellCommandConfiguration();
    let shell_command_id: string;
    const shell_command_configurations = plugin.settings.shell_commands;
    for (shell_command_id in shell_command_configurations) {
        const shell_command_configuration = shell_command_configurations[shell_command_id];
        for (const property_name in shell_command_default_configuration) {
            // @ts-ignore property_default_value can have (almost) whatever datatype
            const property_default_value: any = shell_command_default_configuration[property_name];
            // @ts-ignore
            if (undefined === shell_command_configuration[property_name]) {
                // This shell command does not have this property.
                // Add the property to the shell command and use a default value.
                debugLog("EnsureShellCommandsHaveAllFields(): Shell command #" + shell_command_id + " does not have property '" + property_name + "'. Will create the property and assign a default value '" + property_default_value + "'.");
                // @ts-ignore
                shell_command_configuration[property_name] = property_default_value;
                save = true;
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
    for (const shell_command_id in plugin.settings.shell_commands) {
        const shell_command_configuration: ShellCommandConfiguration = plugin.settings.shell_commands[shell_command_id];
        if (undefined !== shell_command_configuration.shell_command) {
            // The shell command should be migrated.
            if (undefined === shell_command_configuration.platform_specific_commands || shell_command_configuration.platform_specific_commands.default === "") {
                debugLog("Migrating shell command #" + shell_command_id + ": shell_command string will be moved to platforms.default: " + shell_command_configuration.shell_command);
                shell_command_configuration.platform_specific_commands = {
                    default: shell_command_configuration.shell_command,
                };
                delete shell_command_configuration.shell_command;
                save = true;
            } else {
                debugLog("Migration failure for shell command #" + shell_command_id + ": platforms exists already.");
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
    const plugin_path = getPluginAbsolutePath(plugin);
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