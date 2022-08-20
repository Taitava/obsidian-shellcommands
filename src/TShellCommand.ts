/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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

import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import SC_Plugin from "./main";
import {
    generateObsidianCommandName,
    getOperatingSystem,
    mergeSets,
    removeFromSet,
} from "./Common";
import {SC_Event} from "./events/SC_Event";
import {getSC_Events} from "./events/SC_EventList";
import {debugLog} from "./Debug";
import {Command} from "obsidian";
import {VariableSet} from "./variables/loadVariables";
import {getUsedVariables} from "./variables/parseVariables";
import {
    createPreaction,
    CustomVariable,
    getIDGenerator,
    getPATHAugmentation,
    ParsingProcess,
    Preaction,
    PreactionConfiguration
} from "./imports";
import {
    Variable,
    VariableDefaultValueConfiguration,
} from "./variables/Variable";
import {
    PlatformId,
    PlatformNames,
} from "./settings/SC_MainSettings";
import {getIconHTML} from "./Icons";

export interface TShellCommandContainer {
    [key: string]: TShellCommand,
}

/**
 * TODO: Rename this class. Replace the T prefix with something else. The T stands for Type (kind of like TFile from Obsidian), but this is not a type, this is a class. Maybe ShellCommandInstance? It's not the best name, but I can't come up with a better one now.
 */
export class TShellCommand {

    private plugin: SC_Plugin;
    private configuration: ShellCommandConfiguration;
    private obsidian_command: Command;

    constructor (plugin: SC_Plugin, configuration: ShellCommandConfiguration) {
        this.plugin = plugin;
        this.configuration = configuration;

        // Introduce the ID to an ID generator so that it won't accidentally generate the same ID again when creating new shell commands.
        getIDGenerator().addReservedID(configuration.id);
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
        return this.configuration.id;
    }

    public getShell(): string {
        const operating_system = getOperatingSystem();

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
        const operating_system = getOperatingSystem();

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

    /**
     * Returns a list of PlatformIds that have a shell command version defined. 'default' is never included in the list.
     *
     * TODO: Invent a better name for this method.
     */
    public getNonEmptyPlatformIds() {
        const platform_specific_shell_commands = this.getPlatformSpecificShellCommands();
        const platform_ids_with_non_empty_shell_commands: PlatformId[] = [];
        let platform_id: PlatformId;
        for (platform_id in PlatformNames) { // Note that this loop does not iterate 'default' platform id (= the fallback platform id that is used when a shell command does not have a version for the current platform).
            const platform_specific_shell_command = platform_specific_shell_commands[platform_id as PlatformId];
            if (platform_specific_shell_command && "" !== platform_specific_shell_command.trim()) {
                platform_ids_with_non_empty_shell_commands.push(platform_id);
            }
        }
        return platform_ids_with_non_empty_shell_commands;
    }

    public getIconId() {
        return this.configuration.icon;
    }

    public getIconHTML() {
        if (this.configuration.icon) {
            // An icon is defined.
            return getIconHTML(this.configuration.icon);
        } else {
            // No icon is defined.
            return "";
        }
    }

    public getAlias() {
        return this.configuration.alias;
    }

    /**
     * TODO: Use this method in all places where similar logic is needed.
     */
    public getAliasOrShellCommand(): string {
        return this.configuration.alias || this.getShellCommand();
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
        return this.getEventsConfiguration()[sc_event.static().getCode()] || sc_event.getDefaultConfiguration(false);
    }

    public isSC_EventEnabled(event_code: string) {
        const events_configuration =  this.getEventsConfiguration();
        if (undefined === events_configuration[event_code]) {
            // Not enabled
            return false;
        } else {
            // Maybe enabled
            return events_configuration[event_code].enabled;
        }
    }

    /**
     * Called when changing event settings in ShellCommandExtraOptionsModal.
     * plugin.saveSettings() needs to be called after this!
     *
     * @param sc_event
     */
    public enableSC_Event(sc_event: SC_Event) {
        const event_code = sc_event.static().getCode();
        const events_configuration =  this.getEventsConfiguration();
        if (undefined === events_configuration[event_code]) {
            // Not enabled
            // Enable
            events_configuration[event_code] = sc_event.getDefaultConfiguration(true);
        } else {
            // Maybe enabled
            if (!events_configuration[event_code].enabled) {
                events_configuration[event_code].enabled = true;
            }
        }
        if (sc_event.canRegisterAfterChangingSettings()) {
            this.registerSC_Event(sc_event);
        }
        sc_event.onAfterEnabling(this);
    }

    /**
     * Called when changing event settings in ShellCommandExtraOptionsModal.
     * plugin.saveSettings() needs to be called after this!
     *
     * @param sc_event
     */
    public disableSC_Event(sc_event: SC_Event) {
        const event_code = sc_event.static().getCode();
        const events_configuration =  this.getEventsConfiguration();
        if (undefined !== events_configuration[event_code]) {
            // Maybe enabled
            if (events_configuration[event_code].enabled) {
                // Is enabled.
                // Disable.
                const configuration_property_names = Object.getOwnPropertyNames(events_configuration[event_code]);
                if (configuration_property_names.length > 1) {
                    // There's more settings than just 'enable'.
                    // Disable by setting 'enable' to false, don't flush the settings, they can be useful if the event gets re-enabled.
                    events_configuration[event_code].enabled = false;
                } else {
                    // 'enabled' is the only setting.
                    // Disable by removing the configuration object completely to make the settings file cleaner.
                    delete events_configuration[event_code];
                }
            }
        }
        if (sc_event.canRegisterAfterChangingSettings()) {
            this.unregisterSC_Event(sc_event);
        }
    }

    /**
     * Returns all SC_Events that are enabled fro this shell command.
     *
     * Private as it's currently only used domestically, but can be changed to public if needed.
     */
    private getSC_Events(): SC_Event[] {
        const enabled_sc_events: SC_Event[] = [];
        getSC_Events(this.plugin).forEach((sc_event: SC_Event) => {
            if (this.isSC_EventEnabled(sc_event.static().getCode())) {
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
     *
     * @param called_after_changing_settings Set to: true, if this happens after changing configuration; false, if this happens during loading the plugin.
     */
    public registerSC_Events(called_after_changing_settings: boolean) {
        this.getSC_Events().forEach((sc_event: SC_Event) => {
            const can_register = !called_after_changing_settings || sc_event.canRegisterAfterChangingSettings();
            if (can_register) {
                this.registerSC_Event(sc_event);
            }
        });
    }

    public unregisterSC_Events() {
        this.getSC_Events().forEach((sc_event: SC_Event) => {
            this.unregisterSC_Event(sc_event);
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
     * Another name for canAddToCommandPalette().
     */
    public canHaveHotkeys(): boolean {
        return this.canAddToCommandPalette();
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
     * Creates a new ParsingProcess instance and defines two sets of variables:
     *  - First set: All variables that are not tied to any preactions.
     *  - Second set: Variables that are tied to preactions. Can be an empty set.
     * You need to still call ParsingProcess.process() to parse the first set. ShellCommandExecutor takes care of calling
     * ParsingProcess.processRest() to process all non-processed sets.
     *
     * @See ParsingProcess class for a description of the process.
     * @param sc_event Needed to get {{event_*}} variables parsed. Can be left out if working outside any SC_Event context, in which case {{event_*}} variables are inaccessible.
     */
    public createParsingProcess(sc_event: SC_Event | null): ShellCommandParsingProcess {
        return new ParsingProcess<shell_command_parsing_map>(
            this.plugin,
            {
                shell_command: this.getShellCommand(),
                alias: this.getAlias(),
                environment_variable_path_augmentation: getPATHAugmentation(this.plugin) ?? "",
            },
            this,
            sc_event,
            [
                this.getNonPreactionsDependentVariables(), // First set: All variables that are not tied to any preactions.
                this.getPreactionsDependentVariables(), // Second set: Variables that are tied to preactions. Can be an empty set.
            ]
        );
    }

    public setObsidianCommand(obsidian_command: Command) {
        this.obsidian_command = obsidian_command;
    }

    public getObsidianCommand() {
        return this.obsidian_command;
    }

    /**
     * No renaming is done if the shell command is excluded from the command palette.
     */
    public renameObsidianCommand(shell_command: string, alias: string) {
        // Rename the command in command palette
        const prefix = this.plugin.getPluginName() + ": "; // Normally Obsidian prefixes all commands with the plugin name automatically, but now that we are actually _editing_ a command in the palette (not creating a new one), Obsidian won't do the prefixing for us.

        // Check that the shell command is actually registered to Obsidian's command palette.
        if (undefined !== this.obsidian_command) {
            // Yes, the shell command is registered in Obsidian's command palette.
            // Update the command palette name.
            this.obsidian_command.name = prefix + generateObsidianCommandName(this.plugin, shell_command, alias);
        }
        // If the shell command's "command_palette_availability" settings is set to "disabled", then the shell command is not present in this.obsidian_command and so the command palette name does not need updating.
    }

    /**
     * Clears an internal cache used by .getPreactions().
     * Only needed to be called after creating new PreactionConfigurations or deleting old ones. Should not need to be called
     * when modifying properties in existing PreactionConfigurations.
     */
    public resetPreactions() {
        debugLog(`TShellCommand ${this.getId()}: Resetting preactions.`);
        delete this.cached_preactions;
    }

    private cached_preactions: Preaction[];
    public getPreactions(): Preaction[] {
        debugLog(`TShellCommand ${this.getId()}: Getting preactions.`);
        if (!this.cached_preactions) {
            this.cached_preactions = [];
            this.getConfiguration().preactions.forEach((preaction_configuration: PreactionConfiguration) => {
                // Only create the preaction if it's enabled.
                if (preaction_configuration.enabled) {
                    // Yes, it's enabled.
                    // Instantiate the Preaction.
                    this.cached_preactions.push(createPreaction(this.plugin, preaction_configuration, this));
                }
            });
        }
        return this.cached_preactions;
    }

    /**
     * Returns Variables that are not dependent on any Preaction.
     * @private Can be made public if needed.
     */
    private getNonPreactionsDependentVariables(): VariableSet {
        debugLog(`TShellCommand ${this.getId()}: Getting non preactions dependent variables.`);
        const all_variables = this.plugin.getVariables();
        return removeFromSet(all_variables, this.getPreactionsDependentVariables());
    }

    /**
     * @private Can be made public if needed.
     */
    private getPreactionsDependentVariables(): VariableSet {
        debugLog(`TShellCommand ${this.getId()}: Getting preactions dependent variables.`);
        let dependent_variables = new VariableSet();
        for (const preaction of this.getPreactions()) {
            dependent_variables = mergeSets(dependent_variables, preaction.getDependentVariables());
        }
        return dependent_variables;
    }

    /**
     * @return Returns undefined, if no configuration is defined for this variable.
     */
    public getDefaultValueConfigurationForVariable(variable: Variable): VariableDefaultValueConfiguration | undefined {
        return this.configuration.variable_default_values[variable.getIdentifier()];
    }

    /**
     * Returns an URI that can be used in links (in or outside of Obsidian) to execute this shell command. The URI also
     * contains stubs for any possible CustomVariables that might be used in the shell command (if any).
     */
    public getExecutionURI() {
        const execution_uri = SC_Plugin.BASE_URI + "?vault="+encodeURIComponent(this.plugin.app.vault.getName())+"&execute=" + this.getId();

        // Get a list CustomVariables that the shell command uses.
        const custom_variables = new VariableSet();
        for (const custom_variable of getUsedVariables(this.plugin, this.getShellCommand())) {
            // Check that the variable IS a CustomVariable.
            if (custom_variable instanceof CustomVariable) {
                custom_variables.add(custom_variable);
            }
        }

        // Exclude variables whose values will come from Preactions - they will not probably be needed in the URI.
        const custom_variables_suitable_for_uri = removeFromSet(custom_variables, this.getPreactionsDependentVariables());

        // Append the suitable custom variable names to the uri.
        let execution_uri_with_variables = execution_uri;
        for (const custom_variable of custom_variables_suitable_for_uri) {
            execution_uri_with_variables += "&" + custom_variable.variable_name + "=";
        }

        // Finished.
        return execution_uri_with_variables;
    }

    /**
     * Returns an adjacent TShellCommand that appears next in the configuration list. Returns undefined, if this is the
     * last TShellCommand. Used in settings to switch quickly from one TShellCommand to another.
     */
    public nextTShellCommand() {
        const t_shell_commands = Object.values(this.plugin.getTShellCommands());
        const this_index = t_shell_commands.indexOf(this);
        if (this_index === t_shell_commands.length - 1) {
            return undefined;
        }
        return t_shell_commands[this_index + 1];
    }

    /**
     * Returns an adjacent TShellCommand that appears before in the configuration list. Returns undefined, if this is the
     * first TShellCommand. Used in settings to switch quickly from one TShellCommand to another.
     */
    public previousTShellCommand() {
        const t_shell_commands = Object.values(this.plugin.getTShellCommands());
        const this_index = t_shell_commands.indexOf(this);
        if (this_index === 0) {
            return undefined;
        }
        return t_shell_commands[this_index - 1];
    }
}

export interface ShellCommandParsingResult {
    shell_command: string,
    alias: string,
    environment_variable_path_augmentation: string,
    succeeded: boolean;
    error_messages: string[];
}

export type ShellCommandParsingProcess = ParsingProcess<shell_command_parsing_map>;

type shell_command_parsing_map = {
    shell_command: string,
    alias: string,
    environment_variable_path_augmentation: string,
};