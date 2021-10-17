import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import ShellCommandsPlugin from "./main";
import {getOperatingSystem} from "./Common";

export class TShellCommand {

    private plugin: ShellCommandsPlugin;
    private configuration: ShellCommandConfiguration;

    constructor (plugin: ShellCommandsPlugin, configuration: ShellCommandConfiguration) {
        this.plugin = plugin;
        this.configuration = configuration;
    }

    public getShell(): string {
        let operating_system = getOperatingSystem();

        // Check if the shell command has defined a specific shell.
        if (undefined === this.configuration.shells[operating_system]) {
            // The shell command does not define an explicit shell.
            // Use a default shell from the plugin's settings.
            return this.plugin.getDefaultShell();
        } else {
            // The shell command has an explicit shell defined.
            return this.configuration.shells[operating_system];
        }
    }

    public getShellCommand(): string {
        let operating_system = getOperatingSystem();

        // Check if the shell command has defined a specific command for this operating system.
        if (undefined === this.configuration.shell_commands[operating_system]) {
            // No command is defined specifically for this operating system.
            // Return an "OS agnostic" command.
            return this.configuration.shell_commands.default;
        } else {
            // The shell command has defined a specific command for this operating system.
            return this.configuration.shell_commands[operating_system];
        }
    }
}