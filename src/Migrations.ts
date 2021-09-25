import ShellCommandsPlugin from "./main";
import {newShellCommandConfiguration} from "./settings/ShellCommandConfiguration";

export async function RunMigrations(plugin: ShellCommandsPlugin) {
    let save = MigrateCommandsToShellCommands(plugin);
    save ||= EnsureShellCommandsHaveAllFields(plugin);
    if (save) {
        // Only save if there were changes to configuration.
        console.log("Saving migrations...")
        await plugin.saveSettings();
        console.log("Migrations saved...")
    }
}

function MigrateCommandsToShellCommands(plugin: ShellCommandsPlugin) {
    let count_shell_commands = plugin.settings.commands.length;
    let save = false;
    if (0 < count_shell_commands) {
        let count_empty_commands = 0; // A counter for empty or null commands
        console.log("settings.commands is not empty, will migrate " + count_shell_commands + " commands to settings.shell_commands.");
        for (let shell_command_id in plugin.settings.commands) {
            let shell_command = plugin.settings.commands[shell_command_id];
            // Ensure that the command is not empty. Just in case.
            if (null === shell_command || 0 === shell_command.length) {
                // The command is empty
                console.log("Migration failure for shell command #" + shell_command_id + ": The original shell command string is empty, so it cannot be migrated.");
                count_empty_commands++;
            }
            else if (undefined !== plugin.settings.shell_commands[shell_command_id]) {
                // A command with the same id already exists
                console.log("Migration failure for shell command #" + shell_command_id + ": A shell command with same ID already exists in settings.shell_commands.");
            } else {
                // All OK, migrate.
                plugin.settings.shell_commands[shell_command_id] = newShellCommandConfiguration(shell_command); // Creates a shell command with default values and defines the command for it.
                delete plugin.settings.commands[shell_command_id]; // Leaves a null in place, but we can deal with it by deleting the whole array if it gets empty.
                count_empty_commands++; // Account the null generated on the previous line.
                save = true;
                console.log("Migrated shell command #" + shell_command_id + ": " + shell_command);
            }
        }
        if (count_empty_commands === count_shell_commands) {
            // The whole commands array now contains only empty/null commands.
            // Delete it.
            delete plugin.settings.commands;
        }
    } else {
        console.log("settings.commands is empty, so no need to migrate commands. Good thing! :)");
    }
    return save;
}

/**
 * This is a general migrator that adds new, missing properties to ShellCommandConfiguration objects. This is not tied to any specific version update, unlike MigrateCommandsToShellCommands().
 *
 * @param plugin
 * @constructor
 */
function EnsureShellCommandsHaveAllFields(plugin: ShellCommandsPlugin) {
    let save = false;
    let shell_command_default_configuration = newShellCommandConfiguration();
    let shell_command_id: string;
    let shell_command_configurations = plugin.getShellCommands();
    for (shell_command_id in shell_command_configurations) {
        let shell_command_configuration = shell_command_configurations[shell_command_id];
        for (let property_name in shell_command_default_configuration) {
            // @ts-ignore property_default_value can have (almost) whatever datatype
            let property_default_value: any = shell_command_default_configuration[property_name];
            // @ts-ignore
            if (undefined === shell_command_configuration[property_name]) {
                // This shell command does not have this property.
                // Add the property to the shell command and use a default value.
                console.log("EnsureShellCommandsHaveAllFields(): Shell command #" + shell_command_id + " does not have property '" + property_name + "'. Will create the property and assign a default value '" + property_default_value + "'.");
                // @ts-ignore
                shell_command_configuration[property_name] = property_default_value;
                save = true;
            }
        }
    }
    return save;
}