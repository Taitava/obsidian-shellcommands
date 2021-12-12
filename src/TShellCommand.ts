import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import ShellCommandsPlugin from "./main";
import {getOperatingSystem} from "./Common";

export interface TShellCommandContainer {
    [key: string]: TShellCommand,
}

export class TShellCommand {

    private readonly id: string;
    private plugin: ShellCommandsPlugin;
    private configuration: ShellCommandConfiguration;

    constructor (plugin: ShellCommandsPlugin, shell_command_id: string, configuration: ShellCommandConfiguration) {
        this.plugin = plugin;
        this.id = shell_command_id;
        this.configuration = configuration;
    }

    public getPlugin() {
        return this.plugin;
    }
    /**
     * Use this when you need to alter the configuration values. if you only need to read configuration values, use get*()
     * methods instead.
     */
    public getConfiguration() {
        return this.configuration;
    }

    public getId() {
        return this.id;
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

    public getShells() {
        return this.configuration.shells;
    }

    /**
     * Returns a shell command string specific for the current operating system, or a generic shell command if this shell
     * command does not have an explicit version for the current OS.
     */
    public getShellCommand(): string {
        let operating_system = getOperatingSystem();

        // Check if the shell command has defined a specific command for this operating system.
        if (undefined === this.configuration.platform_specific_commands[operating_system]) {
            // No command is defined specifically for this operating system.
            // Return an "OS agnostic" command.
            return this.configuration.platform_specific_commands.default;
        } else {
            // The shell command has defined a specific command for this operating system.
            return this.configuration.platform_specific_commands[operating_system];
        }
    }

    /**
     * Returns a version of the shell command that should be used if no platform specific command is defined for the
     * current platform. If you plan to use this for execution, consider using getShellCommand() instead, as it takes the
     * current platform into account.
     */
    public getDefaultShellCommand() {
        return this.configuration.platform_specific_commands.default;
    }

    public getPlatformSpecificShellCommands() {
        return this.configuration.platform_specific_commands;
    }

    public getAlias() {
        return this.configuration.alias;
    }

    public getConfirmExecution() {
        return this.configuration.confirm_execution;
    }

    public getIgnoreErrorCodes() {
        return this.configuration.ignore_error_codes;
    }

    public getOutputChannelOrder() {
        return this.configuration.output_channel_order;
    }

    public getOutputChannels() {
        return this.configuration.output_channels;
    }

    isAssignedToSC_Event(event_name: string) {
        return this.configuration.events.includes(event_name);
    }
}