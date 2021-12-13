import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import ShellCommandsPlugin from "./main";
import {getOperatingSystem} from "./Common";
import {SC_Event} from "./events/SC_Event";
import {getSC_Events} from "./events/SC_EventList";

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

    public getEventsConfiguration() {
        return this.configuration.events;
    }

    public isSC_EventEnabled(event_name: string) {
        const events_configuration =  this.getEventsConfiguration();
        if (undefined === events_configuration[event_name]) {
            // Not enabled
            return false;
        } else {
            // Maybe enabled
            return events_configuration[event_name].enabled;
        }
    }

    /**
     * plugin.saveSettings() needs to be called after this!
     *
     * @param sc_event
     */
    public enableSC_Event(sc_event: SC_Event) {
        const event_name = sc_event.getName();
        const events_configuration =  this.getEventsConfiguration();
        if (undefined === events_configuration[event_name]) {
            // Not enabled
            // Enable
            events_configuration[event_name] = sc_event.getDefaultConfiguration(true);
        } else {
            // Maybe enabled
            if (!events_configuration[event_name].enabled) {
                events_configuration[event_name].enabled = true;
            }
        }
        this.registerSC_Event(sc_event)
    }

    /**
     * plugin.saveSettings() needs to be called after this!
     *
     * @param sc_event
     */
    public disableSC_Event(sc_event: SC_Event) {
        const event_name = sc_event.getName();
        const events_configuration =  this.getEventsConfiguration();
        if (undefined !== events_configuration[event_name]) {
            // Maybe enabled
            if (events_configuration[event_name].enabled) {
                // Is enabled.
                // Disable.
                const configuration_property_names = Object.getOwnPropertyNames(events_configuration[event_name]);
                if (configuration_property_names.length > 1) {
                    // There's more settings than just 'enable'.
                    // Disable by setting 'enable' to false, don't flush the settings, they can be useful if the event gets re-enabled.
                    events_configuration[event_name].enabled = false;
                } else {
                    // 'enabled' is the only setting.
                    // Disable by removing the configuration object completely to make the settings file cleaner.
                    delete events_configuration[event_name];
                }
            }
        }
        this.unregisterSC_Event(sc_event);
    }

    /**
     * Returns all SC_Events that are enabled fro this shell command.
     *
     * Private as it's currently only used domestically, but can be changed to public if needed.
     */
    private getSC_Events(): SC_Event[] {
        const enabled_sc_events: SC_Event[] = [];
        getSC_Events(this.plugin).forEach((sc_event: SC_Event) => {
            if (this.isSC_EventEnabled(sc_event.getName())) {
                enabled_sc_events.push(sc_event);
            }
        });
        return enabled_sc_events;
    }

    /**
     * Private, if you need access from outside, use enableSC_Event().
     *
     * @param sc_event
     * @private
     */
    private registerSC_Event(sc_event: SC_Event) {
        sc_event.register(this);
    }

    /**
     * Private, if you need access from outside, use disableSC_Event().
     *
     * @param sc_event
     * @private
     */
    private unregisterSC_Event(sc_event: SC_Event) {
        sc_event.unregister(this);
    }

    /**
     * Set's up all events that are enabled for this shell command.
     */
    public registerSC_Events() {
        this.getSC_Events().forEach((sc_event: SC_Event) => {
            this.registerSC_Event(sc_event);
        });
    }
}