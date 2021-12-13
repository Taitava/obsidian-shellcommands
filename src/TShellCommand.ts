import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import ShellCommandsPlugin from "./main";
import {cloneObject, getOperatingSystem} from "./Common";
import {SC_Event} from "./events/SC_Event";
import {getSC_Events} from "./events/SC_EventList";
import { parseShellCommandVariables } from "./variables/parseShellCommandVariables";
import {debugLog} from "./Debug";

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

    public getEventConfiguration(sc_event: SC_Event) {
        return this.getEventsConfiguration()[sc_event.getName()] || sc_event.getDefaultConfiguration(false);
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

    public registerToCommandPalette(): void {
        // TODO: Move the logic from plugin.registerShellCommand() to here, but split to multiple methods.
        this.plugin.registerShellCommand(this);
    }

    public unregisterFromCommandPalette(): void {
        // FIXME: I think the unregistering does not work.
        delete this.plugin.obsidian_commands[this.getId()];
    }

    /**
     * Checks the configuration for command_palette_availability and returns:
     *  - true, if the value is "enabled" or "unlisted"
     *  - false, if the value is "disabled"
     *
     * Adding to command palette also enables hotkeys, which is why adding can be permitted, but showing denied, if a shell command should only be available via hotkeys.
     */
    public canAddToCommandPalette(): boolean {
        return this.getConfiguration().command_palette_availability !== "disabled";
    }

    /**
     * Checks the configuration for command_palette_availability and returns:
     *  - true, if the value is "enabled"
     *  - false, if the value is "disabled" or "unlisted"
     */
    public canShowInCommandPalette(): boolean {
        return this.getConfiguration().command_palette_availability === "enabled";
    }

    /**
     * Parses variables in the shell command and stores them so that the values will be used if the shell command is later executed.
     * Returns a temporary copy of the shell command that contains the changes.
     */
    public preparseVariables() {
        const preparsed_t_shell_command: TShellCommandTemporary = TShellCommandTemporary.fromTShellCommand(this); // Clone t_shell_command so that we won't edit the original configuration.

        // Parse variables in the actual shell command
        const parsed_shell_command = parseShellCommandVariables(this.plugin, preparsed_t_shell_command.getShellCommand(), preparsed_t_shell_command.getShell());
        if (Array.isArray(parsed_shell_command)) {
            // Variable parsing failed, because an array was returned, which contains error messages.
            debugLog("Shell command preview: Variable parsing failed for shell command " + preparsed_t_shell_command.getShellCommand());
            return false;
        } else {
            // Variable parsing succeeded.
            // Use the parsed values.
            preparsed_t_shell_command.getConfiguration().platform_specific_commands = {default: parsed_shell_command}; // Overrides all possible OS specific shell command versions.
        }

        // Also parse variables in an alias, in case the command has one. Variables in aliases do not do anything practical, but they can reveal the user what variables are used in the command.
        const parsed_alias = parseShellCommandVariables(this.plugin, preparsed_t_shell_command.getAlias(), preparsed_t_shell_command.getShell());
        if (Array.isArray(parsed_alias)) {
            // Variable parsing failed, because an array was returned, which contains error messages.
            debugLog("Shell command preview: Variable parsing failed for alias " + preparsed_t_shell_command.getAlias());
            return false;
        } else {
            // Variable parsing succeeded.
            // Use the parsed values.
            preparsed_t_shell_command.getConfiguration().alias = parsed_alias;
        }

        // Store the preparsed shell command so that we can use exactly the same values if the command gets later executed.
        this.plugin.preparsed_t_shell_commands[this.getId()] = preparsed_t_shell_command;

        return preparsed_t_shell_command;
    }
}

class TShellCommandTemporary extends TShellCommand {

    /**
     * @private Do not create new objects directly, use fromTShellCommand() instead.
     * @param plugin
     * @param shell_command_configuration
     */
    constructor(plugin: ShellCommandsPlugin, shell_command_configuration: ShellCommandConfiguration) {
        super(plugin, null, shell_command_configuration);
    }

    public getId(): string {
        throw Error("TShellCommandTemporary does not have an ID, because it is a clone of a real TShellCommand that should not be saved.");
    }

    /**
     * Returns a TShellCommandTemporary instance, which contains configuration that is copied from the given TShellCommand.
     * The clone can be used for altering the configuration temporarily. The clone cannot be saved, and it's ID cannot be
     * accessed.
     */
    public static fromTShellCommand(t_shell_command: TShellCommand) {
        return new TShellCommandTemporary(
            t_shell_command.getPlugin(),
            cloneObject(t_shell_command.getConfiguration()),
        );
    }
}