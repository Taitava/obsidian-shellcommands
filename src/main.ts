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

import {
	CustomVariable,
    CustomVariableInstance,
	CustomVariableInstanceMap,
	CustomVariableModel,
	CustomVariableView,
	getIDGenerator,
	getModel,
	introduceModels,
	PromptMap,
	PromptModel,
	ShellCommandExecutor,
} from "./imports";
import {
    Command,
    Notice,
    ObsidianProtocolData,
    Plugin,
    setIcon,
    WorkspaceLeaf,
} from 'obsidian';
import {
	combineObjects,
	getOperatingSystem,
	getPluginAbsolutePath,
    isWindows,
} from "./Common";
import {RunMigrations} from "./Migrations";
import {
    newShellCommandConfiguration,
    ShellCommandConfiguration,
} from "./settings/ShellCommandConfiguration";
import {
    getDefaultSettings,
    SettingsVersionString,
    SC_MainSettings,
    PlatformId,
} from "./settings/SC_MainSettings";
import {ObsidianCommandsContainer} from "./ObsidianCommandsContainer";
import {SC_MainSettingsTab} from "./settings/SC_MainSettingsTab";
import * as path from "path";
import * as fs from "fs";
import {
    ShellCommandParsingProcess,
    TShellCommand,
    TShellCommandContainer,
    TShellCommandMap,
} from "./models/shell_command/TShellCommand";
import {
    getShell,
    getUsersDefaultShellIdentifier,
    registerBuiltinShells,
} from "./shells/ShellFunctions";
import {versionCompare} from "./lib/version_compare";
import {debugLog, setDEBUG_ON} from "./Debug";
import {addCustomAutocompleteItems} from "./settings/setting_elements/Autocomplete";
import {getSC_Events} from "./events/SC_EventList";
import {SC_Event} from "./events/SC_Event";
import {
	loadVariables,
	VariableSet,
} from "./variables/loadVariables";
import {
    OutputWrapperMap,
    OutputWrapperModel,
} from "./models/output_wrapper/OutputWrapperModel";
import {Shell} from "./shells/Shell";
import {AutocompleteResult} from "autocompleter/autocomplete";
import {
    CustomShellInstanceMap,
    CustomShellModel,
} from "./models/custom_shell/CustomShellModel";

export default class SC_Plugin extends Plugin {
	/**
	 * Defines the settings structure version. Change this when a new plugin version is released, but only if that plugin
	 * version introduces changes to the settings structure. Do not change if the settings structure stays unchanged.
     *
     * This is NOT the plugin's version (although they are often coupled the same)! The plugin's version is defined in manifest.json.
	 */
	public static SettingsVersion: SettingsVersionString = "0.20.0";

	public settings: SC_MainSettings; // TODO: Rename to 'configuration'.
	public obsidian_commands: ObsidianCommandsContainer = {};
	private t_shell_commands: TShellCommandContainer = {};
	private prompts: PromptMap;
	private custom_variable_instances: CustomVariableInstanceMap;
    private customShellInstances: CustomShellInstanceMap;
	private variables: VariableSet;
    private output_wrappers: OutputWrapperMap;

	/**
	 * Holder for shell commands and aliases, whose variables are parsed before the actual execution during command
	 * palette preview. This array gets emptied after every time a shell command is executed via the command palette.
	 *
	 * This is only used for command palette, not when executing a shell command from the settings panel, nor when
	 * executing shell commands via SC_Events.
	 *
	 * @private
	 */
    public cached_parsing_processes: {
		[key: string]: ShellCommandParsingProcess | undefined,
	} = {};

	public static readonly SHELL_COMMANDS_URI_ACTION = "shell-commands";

    /** @see getOutputStatusBarElement() */
    private statusBarElement: HTMLElement;

    private autocompleteMenus: AutocompleteResult[] = [];
    
    /**
     * - Executing shell commands via menus/events does not assign the command to this property.
     * - A shell command is assigned here even if variable parsing was unsuccessful and execution cancelled.
     *
     * Used by the "Re-execute" command.
     *
     * @private
     */
    public lastTShellCommandExecutedFromCommandPalette: TShellCommand | null = null;

	public async onload() {
		// debugLog('loading plugin'); // Wouldn't do anything, as DEBUG_ON is not set before settings are loaded.

		// Load settings
		if (!await this.loadSettings()) {
			// Loading the settings has failed due to an unsupported settings file version.
			// The plugin should not be used, and it has actually disabled itself, but the code execution needs to be
			// stopped manually.
			return;
		}
        // Now debugLog() can be used.
        debugLog("Loading Shell commands plugin version: " + this.getPluginVersion());

		// Define models
		introduceModels(this);

		// Run possible configuration migrations
		await RunMigrations(this);

        // Define builtin shells
        registerBuiltinShells(this);

        // Load CustomShells
        const customShellModel = getModel<CustomShellModel>(CustomShellModel.name);
        this.customShellInstances = customShellModel.loadInstances(this.settings);

		// Generate TShellCommand objects from configuration (only after configuration migrations are done)
		this.loadTShellCommands();

		// Load Prompts
		const prompt_model = getModel<PromptModel>(PromptModel.name);
		this.prompts = prompt_model.loadInstances(this.settings);

		// Load CustomVariables (configuration instances)
		const custom_variable_model = getModel<CustomVariableModel>(CustomVariableModel.name);
		this.custom_variable_instances = custom_variable_model.loadInstances(this.settings);

		// Load variables (both built-in and custom ones). Do this AFTER loading configs for custom variables!
		this.variables = loadVariables(this);

        // Load output wrappers
        const output_wrapper_model = getModel<OutputWrapperModel>(OutputWrapperModel.name);
        this.output_wrappers = output_wrapper_model.loadInstances(this.settings);

        // Make shell commands and other commands appear in Obsidian's command palette.
        this.registerCommandPaletteCommands();

		// Perform event registrations, if enabled.
		if (this.settings.enable_events) {
			this.registerSC_Events(false);
		}

		// Load a custom autocomplete list if it exists.
		this.loadCustomAutocompleteList();

		// Create a SettingsTab.
		this.addSettingTab(new SC_MainSettingsTab(this.app, this));

		// Make it possible to create CustomVariableViews.
		this.registerView(CustomVariableView.ViewType, (leaf: WorkspaceLeaf) => new CustomVariableView(this, leaf));

		// Debug reserved IDs
		debugLog("IDGenerator's reserved IDs:");
		debugLog(getIDGenerator().getReservedIDs());

		// Register an URI handler.
		this.registerURIHandler();
	}

	private loadTShellCommands() {
		this.t_shell_commands = {}; // TODO: Consider changing this to either an array or a Map.
		const shell_command_configurations = this.getShellCommandConfigurations();

		for (const shell_command_configuration of shell_command_configurations) {
			this.t_shell_commands[shell_command_configuration.id] = new TShellCommand(this, shell_command_configuration);
		}
	}

	public getTShellCommands() {
		return this.t_shell_commands;
	}

    /**
     * TODO: Change this.t_shell_commands to a Map, so that getTShellCommands() returns a Map, and remove this method.
     */
    public getTShellCommandsAsMap(): TShellCommandMap {
        const tShellCommandsMap = new TShellCommandMap();
        for (const shellCommandId of Object.getOwnPropertyNames(this.t_shell_commands)) {
            tShellCommandsMap.set(shellCommandId, this.t_shell_commands[shellCommandId]);
        }
        return tShellCommandsMap;
    }

	public getVariables() {
		return this.variables;
	}
    
    public getCustomVariables() {
        return new VariableSet([
            ...Array.from(this.custom_variable_instances.values()).map(
                (customVariableInstance: CustomVariableInstance) => customVariableInstance.getCustomVariable()
            ),
        ]);
    }

	public getPrompts() {
		return this.prompts;
	}

	public getCustomVariableInstances(): CustomVariableInstanceMap {
		return this.custom_variable_instances;
	}

	public getCustomShellInstances(): CustomShellInstanceMap {
		return this.customShellInstances;
	}

	private getShellCommandConfigurations(): ShellCommandConfiguration[] {
		return this.settings.shell_commands;
	}

	public getOutputWrappers() {
		return this.output_wrappers;
	}

    /**
     * Tries to find an index at which a ShellCommandConfiguration object is located in this.settings.shell_commands.
     * Returns undefined, if it's not found.
     *
     * DO NOT EXPOSE THE INDEX OUTSIDE THE PLUGIN! It's not a stable reference to a shell command, because shell commands
     * can be reordered (well, at least in some future version of the plugin). Always use the ID as a stable, externally
     * safe reference!
     *
     * @param shell_command_id
     */
    public getShellCommandConfigurationIndex(shell_command_id: string): number | undefined {
        return this.settings.shell_commands.findIndex((shell_command_configuration: ShellCommandConfiguration) => {
            return shell_command_configuration.id == shell_command_id;
        });
    }

    /**
     * Returns an Obsidian URI that complies with the format obsidian://action/?vault=XYZ and that may contain possible
     * custom arguments at the end.
     *
     * Note that if 'action' is 'open' and a 'file' argument is present in 'uri_arguments', the URI will use the shorthand syntax described here: https://help.obsidian.md/Advanced+topics/Using+obsidian+URI#Shorthand+formats
     *
     * @param action
     * @param uri_arguments
     */
    public getObsidianURI(action: string, uri_arguments: Record<string, string> = {}): string {
        const encoded_vault_name: string = encodeURIComponent(this.app.vault.getName());
        let base_uri: string;

        // Check which kind of uri type should be used: shorthand or normal
        if ("open" === action && uri_arguments.file !== undefined) {
            // Use shorthand uri type for opening a file.
            const encoded_file = encodeURIComponent(uri_arguments.file);
            base_uri = `obsidian://vault/${encoded_vault_name}/${encoded_file}`;
            delete uri_arguments.file; // Prevent adding an extra '&file=' argument to the end of the URI.
        } else {
            // Use normal uri type for everything else.
            base_uri = `obsidian://${action}/?vault=${encoded_vault_name}`;
        }
        let concatenated_uri_arguments = "";
        for (const uri_argument_name in uri_arguments) {
            const uri_argument_value = encodeURIComponent(uri_arguments[uri_argument_name]);
            concatenated_uri_arguments += `&${uri_argument_name}=${uri_argument_value}`;
        }
        return base_uri + concatenated_uri_arguments;
    }

	/**
	 * Creates a new shell command object and registers it to Obsidian's command palette, but does not save the modified
	 * configuration to disk. To save the addition, call saveSettings().
	 */
	public newTShellCommand() {
		const shell_command_id = getIDGenerator().generateID();
		const shell_command_configuration = newShellCommandConfiguration(shell_command_id);
        this.settings.shell_commands.push(shell_command_configuration);
		const t_shell_command: TShellCommand = new TShellCommand(this, shell_command_configuration);
		this.t_shell_commands[shell_command_id] = t_shell_command;
		if (t_shell_command.canAddToCommandPalette()) { // This is probably always true, because the default configuration enables adding to the command palette, but check just in case.
			t_shell_command.registerToCommandPalette();
		}
		return t_shell_command;
	}

    private registerCommandPaletteCommands(): void {
        // Shell commands.
        const shell_commands = this.getTShellCommands();
        for (const shell_command_id in shell_commands) {
            const t_shell_command = shell_commands[shell_command_id];
            if (t_shell_command.canAddToCommandPalette()) {
                t_shell_command.registerToCommandPalette();
            }
        }
        
        // Command: Re-execute last shell command.
        const reExecuteCommandConfiguration = this.settings.command_palette.re_execute_last_shell_command;
        if (reExecuteCommandConfiguration.enabled) {
            this.registerReExecuteCommand(reExecuteCommandConfiguration);
        }
    }
    
    private registerReExecuteCommand(reExecuteCommandConfiguration: typeof this.settings.command_palette.re_execute_last_shell_command) {
        const reExecutePrefix: string = reExecuteCommandConfiguration.prefix;
        const reExecuteCommand: Command = {
            id: "re-execute-from-command-palette",
            name: reExecutePrefix + (this.lastTShellCommandExecutedFromCommandPalette?.getAliasOrShellCommand() ?? "Last shell command"),
            checkCallback: (isOpeningCommandPalette: boolean): boolean | void => { // If isOpeningCommandPalette is true, then the return type is boolean, otherwise void.
                const lastTShellCommand = this.lastTShellCommandExecutedFromCommandPalette;
                if (isOpeningCommandPalette) {
                    // The user is currently opening the command palette.
                    // Show the command only if a previously executed shell command can be found.
                    if (!lastTShellCommand) {
                        debugLog("No shell command is yet executed via command palette.");
                        return false;
                    }
                    
                    // Do not execute the command yet, but parse variables for preview, if enabled in the settings.
                    debugLog("Getting re-execute preview for shell command #" + lastTShellCommand.getId());
                    const pluginPrefix = this.getPluginName() + ": "; // Normally Obsidian prefixes all commands with the plugin name automatically, but now that we are actually _editing_ a command in the palette (not creating a new one), Obsidian won't do the prefixing for us.
                    if (this.settings.preview_variables_in_command_palette) {
                        
                        // Preparse variables.
                        const parsingProcess = lastTShellCommand.createParsingProcess(null); // No SC_Event is available when executing shell commands via the command palette / hotkeys.
                        parsingProcess.process().then((parsingSucceeded: boolean) => {
                            if (parsingSucceeded) {
                                // Parsing succeeded.
                                
                                // Rename Obsidian command.
                                reExecuteCommand.name = pluginPrefix + reExecuteCommandConfiguration.prefix + (TShellCommand.getAliasOrShellCommandContentFromParsingResult(parsingProcess));
                                
                                // Store the preparsed variables so that they will be used if this shell command gets executed.
                                this.cached_parsing_processes[lastTShellCommand.getId()] = parsingProcess;
                            } else {
                                // Parsing failed, so use unparsed lastTShellCommand.getAliasOrShellCommand().
                                reExecuteCommand.name = pluginPrefix + reExecuteCommandConfiguration.prefix + lastTShellCommand.getAliasOrShellCommand();
                                this.cached_parsing_processes[lastTShellCommand.getId()] = undefined;
                            }
                        });
                    } else {
                        // Parsing is disabled, so use unparsed lastTShellCommand.getAliasOrShellCommand().
                        reExecuteCommand.name = pluginPrefix + reExecuteCommandConfiguration.prefix + lastTShellCommand.getAliasOrShellCommand();
                        this.cached_parsing_processes[lastTShellCommand.getId()] = undefined;
                    }
                    
                    // Can show in command palette.
                    return true;
                } else {
                    // Execute a shell command.
                    if (lastTShellCommand) {
                        // A previously executed shell command is found.
                        lastTShellCommand.executeOrShowErrors(
                            this.cached_parsing_processes[lastTShellCommand.getId()], // Can be undefined, if no preparsing was done. executeOrShowErrors() will handle creating the parsing process then.
                        ).then(() => {
                            // Remove obsolete preparsed variables from all shell commands, also from ones that were not executed.
                            this.cached_parsing_processes = {};
                        });
                    } else {
                        // No previously executed shell command exists. (We only get here when a hotkey is pressed, as the re-execute command is not visible in Command palette, if no shell command is yet executed).
                        this.newError("No shell command has been executed yet.");
                    }
                }
            },
            repeatable: false, // TODO: Add a setting to ShellCommandConfiguration that could allow repeating shell commands via hotkeys, then add the `repeatable` property to registerShellCommand(), too. Default value for the setting would be false.
        };
        this.addCommand(reExecuteCommand);
    }
    
	/**
	 * Goes through all events and all shell commands, and for each shell command, registers all the events that the shell
	 * command as enabled in its configuration. Does not modify the configurations.
	 *
	 * @param called_after_changing_settings Set to: true, if this happens after changing configuration; false, if this happens during loading the plugin.
	 */
	public registerSC_Events(called_after_changing_settings: boolean) {
		// Make sure that Obsidian is fully loaded before allowing any events to trigger.
		this.app.workspace.onLayoutReady(() => {
			// Even after Obsidian is fully loaded, wait a while in order to prevent SC_Event_onActiveLeafChanged triggering right after start-up.
			// At least on Obsidian 0.12.19 it's not enough to delay until onLayoutReady, need to wait a bit more in order to avoid the miss-triggering.
			window.setTimeout(() => { // setTimeout() should not need registering to Obsidian API, I guess.
				// Iterate all shell commands and register possible events.
				const shell_commands = this.getTShellCommands();
				for (const shell_command_id in shell_commands) {
					const t_shell_command = shell_commands[shell_command_id];
					t_shell_command.registerSC_Events(called_after_changing_settings);
				}
			}, 0); // 0 means to call the callback on "the next event cycle", according to window.setTimeout() documentation. It should be a long enough delay. But if SC_Event_onActiveLeafChanged still gets triggered during start-up, this value can be raised to for example 1000 (= one second).
		});
	}

	/**
	 * Goes through all events and all shell commands, and makes sure all of them are unregistered, e.g. will not trigger
	 * automatically. Does not modify the configurations.
	 */
	public unregisterSC_Events() {
		// Iterate all events
		getSC_Events(this).forEach((sc_event: SC_Event) => {
			// Iterate all shell commands
			const shell_commands = this.getTShellCommands();
			for (const shell_command_id in shell_commands) {
				const t_shell_command = shell_commands[shell_command_id];
				sc_event.unregister(t_shell_command);
			}
		});
	}

	/**
	 * Defines an Obsidian protocol handler that allows receiving requests via obsidian://shell-commands URI.
	 * @private
	 */
	private registerURIHandler() {
		this.registerObsidianProtocolHandler(SC_Plugin.SHELL_COMMANDS_URI_ACTION, async (parameters: ObsidianProtocolData) => {
			const parameter_names: string[] = Object.getOwnPropertyNames(parameters);

			// Assign values to custom variables (also delete some unneeded entries from parameter_names)
			let custom_variable_assignments_failed = false;
			for (const parameter_index in parameter_names) {
				const parameter_name = parameter_names[parameter_index];

				// Check if the parameter name is a custom variable
				if (parameter_name.match(/^_/)) {
					// This parameter defines a value for a custom variable
					// Find the variable.
					let found_custom_variable = false;
					for (const variable of this.getVariables()) {
						if (variable instanceof CustomVariable && variable.variable_name === parameter_name) {
							// Found the correct variable.
							found_custom_variable = true;

							// Assign the given value to the custom variable.
							await variable.setValue(parameters[parameter_name]);
						}
					}
					if (!found_custom_variable) {
						this.newError("Shell commands URI: A custom variable does not exist: " + parameter_name);
						custom_variable_assignments_failed = true;
					}
				}
			}

			if (!custom_variable_assignments_failed) {
				// Determine action
				if (undefined !== parameters.execute) {
					// Execute a shell command.
					const executable_shell_command_id = parameters.execute;
					parameter_names.remove("execute"); // Mark the parameter as handled. Prevents showing an error message for an unrecognised parameter.

					// Find the executable shell command
					let found_t_shell_command = false;
					const shell_commands = this.getTShellCommands();
					for (const shell_command_id in shell_commands) {
						const t_shell_command = shell_commands[shell_command_id];
						if (t_shell_command.getId() === executable_shell_command_id) {
							// This is the correct shell command.
							found_t_shell_command = true;

							// Execute it.
							const executor = new ShellCommandExecutor(this, t_shell_command, null);
							await executor.doPreactionsAndExecuteShellCommand();

						}
					}
					if (!found_t_shell_command) {
						this.newError("Shell commands URI: A shell command id does not exist: " + executable_shell_command_id);
					}
				}
			}

			// Raise errors for any left-over parameters, if exists.
			for (const parameter_name of parameter_names) {
				switch (parameter_name) {
					case "": // For some reason Obsidian 0.14.5 adds an empty-named parameter if there are no ?query=parameters present.
					case "action": // Obsidian provides this always. Don't show an error message for this.
					case "vault": // Obsidian handles this parameter automatically. Just make sure no error message is displayed when this is present.
						// Do nothing
						break;
					default:
						if (parameter_name.match(/^_/)) {
							// Custom variable parameters (and any possible errors related to them) are already handled above.
							// Do nothing.
						} else {
							// Throw an error for everything else.
							this.newError("Shell commands URI: Unrecognised parameter: " + parameter_name);
						}
				}

			}
		});
	}

	public generateObsidianCommandId(shell_command_id: string) {
		return "shell-command-" + shell_command_id;
	}

	public onunload() {
		debugLog('Unloading Shell commands plugin.');

		// Close CustomVariableViews.
		this.app.workspace.detachLeavesOfType(CustomVariableView.ViewType);

        // Close autocomplete menus.
        for (const autocompleteMenu of this.autocompleteMenus) {
            autocompleteMenu?.destroy();
        }
	}

	/**
	 *
	 * @param current_settings_version
	 * @private
	 * @return True if the given settings version is supported by this plugin version, or an error message string if it's not supported.
	 */
	private isSettingsVersionSupported(current_settings_version: SettingsVersionString) {
		if (current_settings_version === "prior-to-0.7.0") {
			// 0.x.y supports all old settings formats that do not define a version number. This support will be removed in 1.0.0.
			return true;
		} else {
			// Compare the version number
			/** Note that the plugin version may be different than what will be used in the version comparison. The plugin version will be displayed in possible error messages. */
			const plugin_version = this.getPluginVersion();
			const version_comparison = versionCompare(SC_Plugin.SettingsVersion, current_settings_version);
			if (version_comparison === 0) {
				// The versions are equal.
				// Supported.
				return true;
			} else if (version_comparison < 0) {
				// The compared version is newer than what the plugin can support.
				return "The settings file is saved by a newer version of this plugin, so this plugin does not support the structure of the settings file. Please upgrade this plugin to at least version " + current_settings_version + ". Now the plugin version is " + plugin_version;
			} else {
				// The compared version is older than the version that the plugin currently uses to write settings.
				// 0.x.y supports all old settings versions. In 1.0.0, some old settings formats might lose their support, but that's not yet certain.
				return true;
			}

		}
	}

	public getPluginVersion() {
		return this.manifest.version;
	}

	private async loadSettings() {

		// Try to read a settings file
		let all_settings: SC_MainSettings;
		this.settings = await this.loadData(); // May have missing main settings fields, if the settings file is from an older version of SC. It will be migrated later.
		if (null === this.settings) {
			// The settings file does not exist.
			// Use default settings
			this.settings = getDefaultSettings(true);
			all_settings = this.settings;
		} else {
			// Succeeded to load a settings file.
			// In case the settings file does not have 'debug' or 'settings_version' fields, create them.
			all_settings = combineObjects(getDefaultSettings(false), this.settings); // This temporary settings object always has all fields defined (except sub fields, such as shell command specific fields, may still be missing, but they are not needed this early). This is used so that it's certain that the fields 'debug' and 'settings_version' exist.
		}

		// Update debug status - before this line debugging is always OFF!
		setDEBUG_ON(all_settings.debug);

		// Ensure that the loaded settings file is supported.
		const version_support = this.isSettingsVersionSupported(all_settings.settings_version);
		if (typeof version_support === "string") {
			// The settings version is not supported.
			new Notice("SHELL COMMANDS PLUGIN HAS DISABLED ITSELF in order to prevent misinterpreting settings / corrupting the settings file!", 120*1000);
			new Notice(version_support as string, 120*1000);
			await this.disablePlugin();
			return false; // The plugin should not be used.
		}
		return true; // Settings are loaded and the plugin can be used.
	}

	public async saveSettings() {
		// Update settings version in case it's old.
		this.settings.settings_version = SC_Plugin.SettingsVersion;

		// Write settings
		await this.saveData(this.settings);
        
        // Trigger an event so that any program parts relying on cached configuration will know to flush their caches.
        document.dispatchEvent(new Event("SC-configuration-change"));
	}

	private loadCustomAutocompleteList() {
		const custom_autocomplete_file_name = "autocomplete.yaml";
		const custom_autocomplete_file_path = path.join(getPluginAbsolutePath(this, isWindows()), custom_autocomplete_file_name);

		if (fs.existsSync(custom_autocomplete_file_path)) {
			debugLog("loadCustomAutocompleteList(): " + custom_autocomplete_file_name + " exists, will load it now.");
			const custom_autocomplete_content = fs.readFileSync(custom_autocomplete_file_path).toLocaleString();
			const result = addCustomAutocompleteItems(custom_autocomplete_content);
			if (true === result) {
				// OK
				debugLog("loadCustomAutocompleteList(): " + custom_autocomplete_file_name + " loaded.");
			} else {
				// An error has occurred.
				debugLog("loadCustomAutocompleteList(): " + result);
				this.newError("Shell commands: Unable to parse " + custom_autocomplete_file_name + ": " + result);
			}
		} else {
			debugLog("loadCustomAutocompleteList(): " + custom_autocomplete_file_name + " does not exists, so won't load it. This is perfectly ok.");
		}

	}

    /**
     * Puts the given Autocomplete menu into a list of menus that will be destroyed when the plugin unloads.
     * @param autocompleteMenu
     */
    public registerAutocompleteMenu(autocompleteMenu: AutocompleteResult) {
        this.autocompleteMenus.push(autocompleteMenu);
    }

	private async disablePlugin() {
		// This unfortunately accesses a private API.
		// @ts-ignore PRIVATEAPI
		await this.app.plugins.disablePlugin(this.manifest.id);
	}

	public getPluginId() {
		return this.manifest.id;
	}

	public getPluginName() {
		return this.manifest.name;
	}

	public newError(
        message: string | DocumentFragment,
        timeout: number = this.getErrorMessageDurationMs(),
    ) {
		return new Notice(message, timeout);
	}

	public newErrors(messages: string[]) {
		messages.forEach((message: string) => {
			this.newError(message);
		});
	}

    /**
     *
     * @param message
     * @param timeout Custom timeout in milliseconds. If not set, the timeout will be fetched from user configurable settings. Use 0 if you want to disable the timeout, i.e. show the notification until it's explicitly hidden by clinking it, or via code.
     */
	public newNotification(
        message: string | DocumentFragment,
        timeout = this.getNotificationMessageDurationMs(),
    ) {
		return new Notice(message, timeout);
	}

    public getNotificationMessageDurationMs(): number {
        return this.settings.notification_message_duration * 1000; // * 1000 = convert seconds to milliseconds.
    }

    public getErrorMessageDurationMs(): number {
        return this.settings.error_message_duration * 1000; // * 1000 = convert seconds to milliseconds.
    }
    
    /**
     * Returns an explicitly selected shell identifier, if available, or a system's default shell identifier.
     */
	public getDefaultShellIdentifier(): string {
		const platformId = getOperatingSystem();
		let shellIdentifier = this.getDefaultShellIdentifierForPlatform(platformId); // Can also be undefined.
		if (undefined === shellIdentifier) {
			shellIdentifier = getUsersDefaultShellIdentifier();
		}
        return shellIdentifier;
	}
    
    /**
     * Returns undefined, if a system's default shell is used for the given operating system.
     *
     * @param platformId
     */
    public getDefaultShellIdentifierForPlatform(platformId: PlatformId): string | undefined {
        const shellIdentifier: string | undefined = this.settings.default_shells[platformId];
        if (undefined === shellIdentifier && platformId === getOperatingSystem()) {
            // Operating system's default shell should be used, and the passed operating system is the currently running
            // operating system, so it's possible to determine the actual shell.
            return getUsersDefaultShellIdentifier();
        }
        // Note that shellIdentifier can still be undefined.
        return shellIdentifier;
    }

    /**
     * Returns an explicitly selected shell, if available, or a system's default shell identifier.
     */
    public getDefaultShell(): Shell {
        return getShell(this, this.getDefaultShellIdentifier());
    }
    
    /**
     * Returns null, if a system's default shell is used for the given operating system.
     *
     * @param platformId
     */
    public getDefaultShellForPlatform(platformId: PlatformId): Shell | null {
        const shellIdentifier = this.getDefaultShellIdentifierForPlatform(platformId);
        if (undefined === shellIdentifier) {
            return null;
        } else {
            return getShell(this, shellIdentifier);
        }
    }

	public createCustomVariableView(): void {
		const leaf = this.app.workspace.getRightLeaf(false);
		leaf.setViewState({
			type: CustomVariableView.ViewType,
			active: true,
		}).then();
		this.app.workspace.revealLeaf(leaf);
	}

	/**
	 * Called when CustomVariable values are changed.
	 */
	public async updateCustomVariableViews() {
		for (const leaf of this.app.workspace.getLeavesOfType(CustomVariableView.ViewType)) {
			await (leaf.view as CustomVariableView).updateContent();
		}
	}

    /**
     * Used by OutputChannel_StatusBar.
     * TODO: Make it possible to have multiple status bar elements. It should be a shell command level setting, where a shell command opts for either to use their own status bar element, or a common one.
     */
    public getOutputStatusBarElement() {
        if (!this.statusBarElement) {
            this.statusBarElement = this.addStatusBarItem();
        }
        return this.statusBarElement;
    }

    /**
     * Creates an icon button that when clicked, will send a request to terminate shell command execution intermittently.
     *
     * @param containerElement
     * @param processTerminator A callback that will actually terminate the shell command execution process.
     */
    public createRequestTerminatingButton(containerElement: HTMLElement, processTerminator: () => void) {
        const button = containerElement.createEl('a', {
            prepend: true,
            attr: {
                "aria-label": "Request to terminate the process",
                class: "SC-icon-terminate-process",
            },
        });
        setIcon(button, "power");
        button.onclick = (event) => {
            processTerminator();
            event.preventDefault();
            event.stopPropagation();
        };
    }
}


