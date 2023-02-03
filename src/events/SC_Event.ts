/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import SC_Plugin from "../main";
import {App, EventRef} from "obsidian";
import {
    ShellCommandParsingProcess,
    TShellCommand,
} from "../TShellCommand";
import {SC_EventConfiguration} from "./SC_EventConfiguration";
import {cloneObject} from "../Common";
import {Variable} from "../variables/Variable";
import {EventVariable} from "../variables/event_variables/EventVariable";
import {DocumentationEventsFolderLink} from "../Documentation";
import {
    ShellCommandExecutor
} from "../imports";
import {debugLog} from "../Debug";

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
        return this.subclass_instance.constructor as typeof SC_Event;
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
     * @param t_shell_command
     * @param parsing_process SC_MenuEvent can use this to pass an already started ParsingProcess instance. If omitted, a new ParsingProcess will be created.
     */
    protected async trigger(t_shell_command: TShellCommand, parsing_process?: ShellCommandParsingProcess) {
        debugLog(this.constructor.name + ": Event triggers executing shell command id " + t_shell_command.getId());
        // Execute the shell command.
        const executor = new ShellCommandExecutor(this.plugin, t_shell_command, this);
        await executor.doPreactionsAndExecuteShellCommand(parsing_process);
    }

    public static getCode() {
        return this.event_code;
    }

    public static getTitle() {
        return this.event_title;
    }

    /**
     * Creates a list of variables to the given container element. Each variable is a link to its documentation.
     *
     * @param container
     * @return A boolean indicating whether anything was created or not. Not all SC_Events utilise event variables.
     */
    public createSummaryOfEventVariables(container: HTMLElement): boolean {
        let hasCreatedElements = false;
        this.getEventVariables().forEach((variable: Variable) => {
            if (hasCreatedElements) {
                container.insertAdjacentText("beforeend", ", ");
            }
            hasCreatedElements = true;
            variable.createDocumentationLinkElement(container);
        });
        return hasCreatedElements;
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
        const configuration = cloneObject<SC_EventConfiguration>(this.default_configuration);
        configuration.enabled = enabled;
        return configuration;
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