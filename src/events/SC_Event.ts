import ShellCommandsPlugin from "../main";
import {App, EventRef} from "obsidian";
import {TShellCommand} from "../TShellCommand";
import {parseShellCommandVariables} from "../variables/parseShellCommandVariables";
import {SC_EventConfiguration} from "./SC_EventConfiguration";
import {cloneObject} from "../Common";

/**
 * Named SC_Event instead of just Event, because Event is a class in JavaScript.
 */
export abstract class SC_Event {
    protected readonly plugin: ShellCommandsPlugin;
    protected readonly app: App;
    protected abstract readonly event_name: string;
    protected abstract readonly event_title: string;
    private event_registrations: {
        [key: string]: EventRef, // key: t_shell_command id
    } = {};
    protected default_configuration: SC_EventConfiguration = {
        enabled: false,
    };

    public constructor(plugin: ShellCommandsPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    public register(t_shell_command: TShellCommand) {
        const event_reference = this._register(t_shell_command);
        if (event_reference) {
            this.plugin.registerEvent(event_reference);
            this.event_registrations[t_shell_command.getId()] = event_reference;
        }
    }

    public unregister(t_shell_command: TShellCommand) {
        // Check if an EventRef is available.
        if (undefined === this.event_registrations[t_shell_command.getId()]) {
            // The event was registered without an EventRef object.
            // Provide a TShellCommand to _unregister() so it can do a custom unregistering.
            this._unregister(t_shell_command);
        } else {
            // The event registration had created an EventRef object.
            // Provide the EventRef to _unregister() and forget it afterwards.
            this._unregister(this.event_registrations[t_shell_command.getId()]);
            delete this.event_registrations[t_shell_command.getId()];
        }
    }

    protected abstract _register(t_shell_command: TShellCommand): false | EventRef;

    protected abstract _unregister(t_shell_command: TShellCommand): void;
    protected abstract _unregister(event_reference: EventRef): void;

    /**
     * Executes all shell commands that are assigned to this event.
     */
    protected trigger(t_shell_command: TShellCommand) {
        // Parse variables
        let parsed_shell_command;
        if (this.plugin.preparsed_t_shell_commands[t_shell_command.getId()]) {
            // A preparsed shell command exists, use it in order to use same values that were already shown to a user.
            parsed_shell_command = this.plugin.preparsed_t_shell_commands[t_shell_command.getId()].getShellCommand();
        } else {
            // No preparsed shell command exists, so parse now.
            parsed_shell_command = parseShellCommandVariables(this.plugin, t_shell_command.getShellCommand(), t_shell_command.getShell());
        }

        // Check the parsing result.
        if (Array.isArray(parsed_shell_command)) {
            // Errors occurred when parsing variables.
            this.plugin.newErrors(parsed_shell_command);
        } else {
            // Variables were parsed ok.
            // Execute the shell command.
            this.plugin.confirmAndExecuteShellCommand(parsed_shell_command, t_shell_command);
        }
    }

    public getName() {
        return this.event_name;
    }

    public getTitle() {
        return this.event_title;
    }

    /**
     * Can be overridden in child classes that need custom settings fields.
     *
     * @param enabled
     */
    public getDefaultConfiguration(enabled: boolean): SC_EventConfiguration {
        const configuration = cloneObject(this.default_configuration);
        configuration.enabled = enabled;
        return configuration
    }

    protected getConfiguration(t_shell_command: TShellCommand) {
        return t_shell_command.getEventConfiguration(this);
    }

    /**
     * Can be overridden in child classes to provide custom configuration fields for ShellCommandsExtraOptionsModal.
     *
     * @param extra_settings_container
     */
    public createExtraSettingsFields(extra_settings_container: HTMLDivElement, t_shell_command: TShellCommand): void {
        // Most classes do not define custom settings, so for those classes this method does not need to do anything.
    }
}