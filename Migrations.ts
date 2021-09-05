import ShellCommandsPlugin, {ShellCommandConfiguration} from "./main";

export async function RunMigrations(plugin: ShellCommandsPlugin) {
    let save = MigrateCommandsToShellCommands(plugin);
    if (save) {
        // Only save if there were changes to configuration.
        console.log("Saving migrations...")
        await plugin.saveSettings();
        console.log("Migrations saved...")
    }
}

function MigrateCommandsToShellCommands(plugin: ShellCommandsPlugin) {
    let count_commands = plugin.settings.commands.length;
    let save = false;
    if (0 < count_commands) {
        let count_empty_commands = 0; // A counter for empty or null commands
        console.log("settings.commands is not empty, will migrate " + count_commands + " commands to settings.shell_commands.");
        for (let command_id in plugin.settings.commands) {
            let shell_command_string = plugin.settings.commands[command_id];
            // Ensure that the command is not empty. Just in case.
            if (null === shell_command_string || 0 === shell_command_string.length) {
                // The command is empty
                console.log("Migration failure for command #" + command_id + ": The original command string is empty, so it cannot be migrated.");
                count_empty_commands++;
            }
            else if (undefined !== plugin.settings.shell_commands[command_id]) {
                // A command with the same id already exists
                console.log("Migration failure for command #" + command_id + ": A command with same ID already exists in settings.shell_commands.");
            } else {
                // All OK, migrate.
                plugin.settings.shell_commands[command_id] = {
                    shell_command: shell_command_string
                };
                delete plugin.settings.commands[command_id]; // Leaves a null in place, but we can deal with it by deleting the whole array if it gets empty.
                count_empty_commands++; // Account the null generated on the previous line.
                save = true;
                console.log("Migrated command #" + command_id + ": " + shell_command_string);
            }
        }
        if (count_empty_commands === count_commands) {
            // The whole commands array now contains only empty/null commands.
            // Delete it.
            delete plugin.settings.commands;
        }
    } else {
        console.log("settings.commands is empty, so no need to migrate commands. Good thing! :)");
    }
    return save;
}