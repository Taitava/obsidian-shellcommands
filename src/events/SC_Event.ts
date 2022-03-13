import SC_Plugin from "../main";
import {App, EventRef} from "obsidian";
import {ShellCommandParsingResult, TShellCommand} from "../TShellCommand";
import {SC_EventConfiguration} from "./SC_EventConfiguration";
import {cloneObject} from "../Common";
import {Variable} from "../variables/Variable";
import {EventVariable} from "../variables/event_variables/EventVariable";
import {DocumentationEventsFolderLink} from "../Documentation";
import {
    ShellCommandExecutor
} from "../imports";

/**
 * Named SC_Event instead of just Event, because Event is a class in JavaScript.
 */
export abstract class SC_Event {
    protected readonly plugin: SC_Plugin;
    protected readonly app: App;

    /**
     * @protected
     * @abstract Should be abstract, but cannot mark is as abstract because it's also static.
     */
    protected static readonly event_code: string;

    /**
     * @protected
     * @abstract Should be abstract, but cannot mark is as abstract because it's also static.
     */
    protected static readonly event_title: string;

    /**
     * If true, changing the enabled/disabled status of the event permits registering the event immediately, so it can activate
     * anytime. Usually true, but can be set to false if immediate registering tends to trigger the event unnecessarily.
     *
     * Events are always registered when loading the plugin, regardless of this property.
     * @protected
     */
    protected register_after_changing_settings = true;

    private event_registrations: {
        [key: string]: EventRef, // key: t_shell_command id
    } = {};
    protected default_configuration: SC_EventConfiguration = {
        enabled: false,
    };

    public constructor(plugin: SC_Plugin) {
        this.plugin = plugin;
        this.app = plugin.app;

        this.subclass_instance = this; // Stores a subclass reference, not a base class reference.
    }

    /**
     * Contains a version of 'this' variable that refers to the actual subclass, not this base class.
     * TODO: Perhaps move to a new class that will become a parent of this class?
     * @private
     */
    private subclass_instance: this;
    public getClass() {
        return this.subclass_instance.constructor as typeof SC_Event
    }

    public canRegisterAfterChangingSettings(): boolean {
        return this.register_after_changing_settings;
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
     * Executes a shell command.
     */
    protected trigger(t_shell_command: TShellCommand, parsing_result: ShellCommandParsingResult | undefined = undefined) {
        // Check if variables are not yet parsed. (They might be parsed already by SC_MenuEvent).
        if (undefined === parsing_result) {
            // No preparsed shell command exists, so parse now.
            parsing_result = t_shell_command.parseVariables(this);

            // Check the parsing result.
            if (!parsing_result.succeeded) {
                // Errors occurred when parsing variables.
                this.plugin.newErrors(parsing_result.error_messages);
                return;
            }
        }

        // Execute the shell command.
        const executor = new ShellCommandExecutor(this.plugin, t_shell_command, this);
        executor.confirmAndExecuteShellCommand(parsing_result);
    }

    public static getCode() {
        return this.event_code;
    }

    public static getTitle() {
        return this.event_title;
    }

    public getSummaryOfEventVariables(): string {
        const variable_names: string[] = [];
        this.getEventVariables().forEach((variable: Variable) => {
            variable_names.push("{{" + variable.variable_name + "}}");
        });
        return variable_names.join(", ");
    }

    private getEventVariables() {
        const event_variables: EventVariable[] = [];
        this.plugin.getVariables().forEach((variable: Variable) => {
            // Check if the variable is an EventVariable
            if (variable instanceof EventVariable) {
                // Yes it is.
                // Check if the variable supports this particular event.
                if (variable.supportsSC_Event(this.getClass())) {
                    // Yes it supports.
                    event_variables.push(variable);
                }
            }
        });
        return event_variables;
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

    /**
     * Returns all the TShellCommand instances that have enabled this event.
     */
    public getTShellCommands(): TShellCommand[] {
        const enabled_t_shell_commands: TShellCommand[] = [];
        Object.values(this.plugin.getTShellCommands()).forEach((t_shell_command: TShellCommand) => {
            // Check if this event has been enabled for the shell command.
            if (t_shell_command.isSC_EventEnabled(this.static().event_code)) {
                // Yes, it's enabled.
                enabled_t_shell_commands.push(t_shell_command);
            }
        });
        return enabled_t_shell_commands;
    }

    public static() {
        return this.constructor as typeof SC_Event;
    }

    /**
     * Child classes can override this to hook into a situation where a user has enabled an event in settings.
     *
     * @param t_shell_command The TShellCommand instance for which this SC_Event was enabled for.
     */
    public onAfterEnabling(t_shell_command: TShellCommand): void {
        // If an SC_Event does not override this hook method, do nothing.
    }

    public static getDocumentationLink(): string {
        return DocumentationEventsFolderLink + encodeURIComponent(this.event_title);
    }
}