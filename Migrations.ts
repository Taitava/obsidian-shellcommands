import ShellCommandsPlugin, {newShellCommandConfiguration} from "./main";

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