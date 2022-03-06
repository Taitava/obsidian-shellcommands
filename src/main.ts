import {Command, Notice, Plugin} from 'obsidian';
import {exec, ExecException, ExecOptions} from "child_process";
import {
	combineObjects,
	generateObsidianCommandName,
	getOperatingSystem,
	getPluginAbsolutePath,
	getVaultAbsolutePath,
} from "./Common";
import {RunMigrations} from "./Migrations";
import {
	newShellCommandConfiguration,
	ShellCommandsConfiguration
} from "./settings/ShellCommandConfiguration";
import {
	getDefaultSettings,
	SettingsVersionString,
	SC_MainSettings,
} from "./settings/SC_MainSettings";
import {ObsidianCommandsContainer} from "./ObsidianCommandsContainer";
import {SC_MainSettingsTab} from "./settings/SC_MainSettingsTab";
import * as path from "path";
import * as fs from "fs";
import {ConfirmExecutionModal} from "./ConfirmExecutionModal";
import {handleShellCommandOutput} from "./output_channels/OutputChannelDriverFunctions";
import {BaseEncodingOptions} from "fs";
import {ParsingResult, TShellCommand, TShellCommandContainer} from "./TShellCommand";
import {getUsersDefaultShell, isShellSupported} from "./Shell";
import {versionCompare} from "./lib/version_compare";
import {debugLog, setDEBUG_ON} from "./Debug";
import {addCustomAutocompleteItems} from "./settings/setting_elements/Autocomplete";
import {getSC_Events} from "./events/SC_EventList";
import {SC_Event} from "./events/SC_Event";
import {
	CustomVariableInstance,
	CustomVariableModel,
	getModel,
	introduceModels,
	loadPrompts,
	Preaction,
} from "./imports";

export default class SC_Plugin extends Plugin {
	/**
	 * Defines the settings structure version. Change this when a new plugin version is released, but only if that plugin
	 * version introduces changes to the settings structure. Do not change if the settings structure stays unchanged.
	 */
	public static SettingsVersion: SettingsVersionString = "0.11.0";

	public settings: SC_MainSettings; // TODO: Make private and add a getter.
	public obsidian_commands: ObsidianCommandsContainer = {};
	private t_shell_commands: TShellCommandContainer = {};
	private custom_variable_instances: CustomVariableInstance[];

	/**
	 * Holder for shell commands and aliases, whose variables are parsed before the actual execution during command
	 * palette preview. This array gets emptied after every time a shell command is executed via the command palette.
	 *
	 * This is only used for command palette, not when executing a shell command from the settings panel, nor when
	 * executing shell commands via SC_Events.
	 *
	 * @private
	 */
	private cached_parsing_results: {
		[key: string]: ParsingResult,
	} = {};

	public async onload() {
		debugLog('loading plugin');

		// Load settings
		if (!await this.loadSettings()) {
			// Loading the settings has failed due to an unsupported settings file version.
			// The plugin should not be used, and it has actually disabled itself, but the code execution needs to be
			// stopped manually.
			return;
		}

		// Run possible configuration migrations
		await RunMigrations(this);

		// Define models
		introduceModels(this);

		// Generate TShellCommand objects from configuration (only after configuration migrations are done)
		this.loadTShellCommands();

		// Load Prompts
		loadPrompts(this, this.settings.prompts);

		// Load CustomVariables
		const custom_variable_model = getModel<CustomVariableModel>(CustomVariableModel.name);
		this.custom_variable_instances = custom_variable_model.createInstances(this.settings);


		// Make all defined shell commands to appear in the Obsidian command palette.
		const shell_commands = this.getTShellCommands();
		for (const shell_command_id in shell_commands) {
			const t_shell_command = shell_commands[shell_command_id];
			if (t_shell_command.canAddToCommandPalette()) {
				this.registerShellCommand(t_shell_command);
			}
		}

		// Perform event registrations, if enabled.
		if (this.settings.enable_events) {
			this.registerSC_Events(false);
		}

		// Load a custom autocomplete list if it exists.
		this.loadCustomAutocompleteList();

		this.addSettingTab(new SC_MainSettingsTab(this.app, this));
	}

	private loadTShellCommands() {
		this.t_shell_commands = {};
		const shell_command_configurations = this.getShellCommandConfigurations();

		for (const shell_command_id in shell_command_configurations) {
			this.t_shell_commands[shell_command_id] = new TShellCommand(this, shell_command_id, shell_command_configurations[shell_command_id]);
		}
	}

	public getTShellCommands() {
		return this.t_shell_commands;
	}

	public getCustomVariableInstances(): CustomVariableInstance[] {
		return this.custom_variable_instances;
	}

	private getShellCommandConfigurations(): ShellCommandsConfiguration {
		return this.settings.shell_commands;
	}

	/**
	 * Creates a new shell command object and registers it to Obsidian's command palette, but does not save the modified
	 * configuration to disk. To save the addition, call saveSettings().
	 */
	public newTShellCommand() {
		const shell_command_id = this.generateNewShellCommandID();
		const shell_command_configuration = newShellCommandConfiguration();
		this.settings.shell_commands[shell_command_id] = shell_command_configuration;
		const t_shell_command: TShellCommand = new TShellCommand(this, shell_command_id, shell_command_configuration);
		this.t_shell_commands[shell_command_id] = t_shell_command;
		if (t_shell_command.canAddToCommandPalette()) { // This is probably always true, because the default configuration enables adding to the command palette, but check just in case.
			this.registerShellCommand(t_shell_command);
		}
		return t_shell_command;
	}

	/**
	 * TODO: Move to TShellCommand.registerToCommandPalette(), but split to multiple methods.
	 *
	 * @param t_shell_command
	 */
	public registerShellCommand(t_shell_command: TShellCommand) {
		const shell_command_id = t_shell_command.getId();
		debugLog("Registering shell command #" + shell_command_id + "...");

		// Define a function for executing the shell command.
		const executor = (parsing_result: ParsingResult | undefined) => {
			if (undefined === parsing_result) {
				parsing_result = t_shell_command.parseVariables();
			}
			if (parsing_result.succeeded) {
				// The command was parsed correctly.
				this.confirmAndExecuteShellCommand(t_shell_command, parsing_result);
			} else {
				// The command could not be parsed correctly.
				// Display error messages
				this.newErrors(parsing_result.error_messages);
			}
		}

		// Register an Obsidian command
		const obsidian_command: Command = {
			id: this.generateObsidianCommandId(shell_command_id),
			name: generateObsidianCommandName(this, t_shell_command.getShellCommand(), t_shell_command.getAlias()), // Will be overridden in command palette, but this will probably show up in hotkey settings panel.
			// Use 'checkCallback' instead of normal 'callback' because we also want to get called when the command palette is opened.
			checkCallback: (is_opening_command_palette): boolean | void => { // If is_opening_command_palette is true, then the return type is boolean, otherwise void.
				if (is_opening_command_palette) {
					// The user is currently opening the command palette.

					// Check can the shell command be shown in command palette
					if (!t_shell_command.canShowInCommandPalette()) {
						// Cancel preview and deny showing in command palette.
						debugLog("Shell command #" + t_shell_command.getId() + " won't be shown in command palette.");
						return false;
					}

					// Do not execute the command yet, but parse variables for preview, if enabled in the settings.
					debugLog("Getting command palette preview for shell command #" + t_shell_command.getId());
					if (this.settings.preview_variables_in_command_palette) {
						// Preparse variables
						const parsing_result = t_shell_command.parseVariables();
						if (parsing_result.succeeded) {
							// Parsing succeeded

							// Rename Obsidian command
							t_shell_command.renameObsidianCommand(parsing_result.shell_command, parsing_result.alias);

							// Store the preparsed variables so that they will be used if this shell command gets executed.
							this.cached_parsing_results[t_shell_command.getId()] = parsing_result;

							// All done now
							return true;
						}
					}

					// If parsing failed (or was disabled), then use unparsed t_shell_command.getShellCommand() and t_shell_command.getAlias().
					t_shell_command.renameObsidianCommand(t_shell_command.getShellCommand(), t_shell_command.getAlias());
					this.cached_parsing_results[t_shell_command.getId()] = undefined;
					return true;

				} else {
					// The user has instructed to execute the command.
					executor(
						this.cached_parsing_results[t_shell_command.getId()], // Can be undefined, if no preparsing was done. executor() will handle parsing then.
					);

					// Delete the whole array of preparsed commands. Even though we only used just one command from it, we need to notice that opening a command
					// palette might generate multiple preparsed commands in the array, but as the user selects and executes only one command, all these temporary
					// commands are now obsolete. Delete them just in case the user toggles the variable preview feature off in the settings, or executes commands via hotkeys. We do not want to
					// execute obsolete commands accidentally.
					// This deletion also needs to be done even if the executed command was not a preparsed command, because
					// even when preparsing is turned on in the settings, some commands may fail to parse, and therefore they would not be in this array, but other
					// commands might be.
					this.cached_parsing_results = {}; // Removes obsolete preparsed variables from all shell commands.
					return; // When we are not in the command palette check phase, there's no need to return a value. Just have this 'return' statement because all other return points have a 'return' too.
				}
			}
		};
		this.addCommand(obsidian_command)
		this.obsidian_commands[shell_command_id] = obsidian_command; // Store the reference so that we can edit the command later in ShellCommandsSettingsTab if needed. TODO: Use tShellCommand instead.
		t_shell_command.setObsidianCommand(obsidian_command);
		debugLog("Registered.")
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

	public generateObsidianCommandId(shell_command_id: string) {
		return "shell-command-" + shell_command_id;
	}

	/**
	 * Performs preactions, and if they all give resolved Promises, executes the shell command.
	 *
	 * TODO: Change the name of this method to reflect the new behavior.
	 *
	 * @param t_shell_command Used for reading other properties. t_shell_command.shell_command won't be used!
	 * @param shell_command_parsing_result The actual shell command that will be executed.
	 */
	public confirmAndExecuteShellCommand(t_shell_command: TShellCommand, shell_command_parsing_result: ParsingResult) {

		// Perform preactions before execution
		const preactions = t_shell_command.getPreactions(shell_command_parsing_result);
		let preaction_pipeline = Promise.resolve(); // Will contain a series of preaction performs.
		preactions.forEach((preaction: Preaction) => {
			preaction_pipeline = preaction_pipeline.then(() => {
				return preaction.perform();
			});
		});
		preaction_pipeline.then(() => {
			// Execute

			// TODO: This confirmation check should be migrated into a Preaction. We should go now directly to the execution part.
			// Check if the command needs confirmation before execution
			if (t_shell_command.getConfirmExecution()) {
				// Yes, a confirmation is needed.
				// Open a confirmation modal.
				new ConfirmExecutionModal(this, shell_command_parsing_result, t_shell_command)
					.open()
				;
				return; // Do not execute now. The modal will call executeShellCommand() later if needed.
				// TODO: This confirmation check should be migrated into a Preaction.
			} else {
				// No need to confirm.
				// Execute.
				this.executeShellCommand(t_shell_command, shell_command_parsing_result);
			}
		}).catch(() => {
			// Cancel execution
			debugLog("Shell command execution cancelled.")
		});


	}

	/**
	 * Does not ask for confirmation before execution. This should only be called if: a) a confirmation is already asked from a user, or b) this command is defined not to need a confirmation.
	 * Use confirmAndExecuteShellCommand() instead to have a confirmation asked before the execution.
	 *
	 * @param t_shell_command Used for reading other properties. t_shell_command.shell_command won't be used!
	 * @param shell_command_parsing_result The actual shell command that will be executed is taken from this object's '.shell_command' property.
	 */
	public executeShellCommand(t_shell_command: TShellCommand, shell_command_parsing_result: ParsingResult) {
		const working_directory = this.getWorkingDirectory();

		// Check that the shell command is not empty
		const shell_command = shell_command_parsing_result.shell_command.trim();
		if (!shell_command.length) {
			// It is empty
			debugLog("The shell command is empty. :(");
			this.newError("The shell command is empty :(");
			return;
		}

		// Check that the currently defined shell is supported by this plugin. If using system default shell, it's possible
		// that the shell is something that is not supported. Also, the settings file can be edited manually, and incorrect
		// shell can be written there.
		const shell = t_shell_command.getShell();
		if (!isShellSupported(shell)) {
			debugLog("Shell is not supported: " + shell);
			this.newError("This plugin does not support the following shell: " + shell);
			return;
		}


		// Check that the working directory exists and is a folder
		if (!fs.existsSync(working_directory)) {
			// Working directory does not exist
			// Prevent execution
			debugLog("Working directory does not exist: " + working_directory);
			this.newError("Working directory does not exist: " + working_directory);
		}
		else if (!fs.lstatSync(working_directory).isDirectory()) {
			// Working directory is not a directory.
			// Prevent execution
			debugLog("Working directory exists but is not a folder: " + working_directory);
			this.newError("Working directory exists but is not a folder: " + working_directory);
		} else {
			// Working directory is OK
			// Prepare execution options
			const options: BaseEncodingOptions & ExecOptions = {
				"cwd": working_directory,
				"shell": shell,
			};

			// Execute the shell command
			debugLog("Executing command " + shell_command + " in " + working_directory + "...");
			exec(shell_command, options, (error: ExecException|null, stdout: string, stderr: string) => {

				// Did the shell command execute successfully?
				if (null !== error) {
					// Some error occurred
					debugLog("Command executed and failed. Error number: " + error.code + ". Message: " + error.message);

					// Check if this error should be displayed to the user or not
					if (t_shell_command.getIgnoreErrorCodes().contains(error.code)) {
						// The user has ignored this error.
						debugLog("User has ignored this error, so won't display it.");

						// Handle only stdout output stream
						handleShellCommandOutput(this, t_shell_command, shell_command_parsing_result, stdout, "", null);
					} else {
						// Show the error.
						debugLog("Will display the error to user.");

						// Check that stderr actually contains an error message
						if (!stderr.length) {
							// Stderr is empty, so the error message is probably given by Node.js's child_process.
							// Direct error.message to the stderr variable, so that the user can see error.message when stderr is unavailable.
							stderr = error.message;
						}

						// Handle both stdout and stderr output streams
						handleShellCommandOutput(this, t_shell_command, shell_command_parsing_result, stdout, stderr, error.code);
					}
				} else {
					// Probably no errors, but do one more check.

					// Even when 'error' is null and everything should be ok, there may still be error messages outputted in stderr.
					if (stderr.length > 0) {
						// Check a special case: should error code 0 be ignored?
						if (t_shell_command.getIgnoreErrorCodes().contains(0)) {
							// Exit code 0 is on the ignore list, so suppress stderr output.
							stderr = "";
							debugLog("Shell command executed: Encountered error code 0, but stderr is ignored.");
						} else {
							debugLog("Shell command executed: Encountered error code 0, and stderr will be relayed to an output handler.");
						}
					} else {
						debugLog("Shell command executed: No errors.");
					}

					// Handle output
					handleShellCommandOutput(this, t_shell_command, shell_command_parsing_result, stdout, stderr, 0); // Use zero as an error code instead of null (0 means no error). If stderr happens to contain something, exit code 0 gets displayed in an error balloon (if that is selected as a driver for stderr).
				}
			});
		}
	}

	private getWorkingDirectory() {
		// Returns either a user defined working directory, or an automatically detected one.
		const working_directory = this.settings.working_directory;
		if (working_directory.length == 0) {
			// No working directory specified, so use the vault directory.
			return getVaultAbsolutePath(this.app);
		} else if (!path.isAbsolute(working_directory)) {
			// The working directory is relative.
			// Help to make it refer to the vault's directory. Without this, the relative path would refer to Obsidian's installation directory (at least on Windows).
			return path.join(getVaultAbsolutePath(this.app), working_directory);
		}
		return working_directory;
	}

	public onunload() {
		debugLog('unloading plugin');
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
	}

	private loadCustomAutocompleteList() {
		const custom_autocomplete_file_name = "autocomplete.yaml";
		const custom_autocomplete_file_path = path.join(getPluginAbsolutePath(this), custom_autocomplete_file_name);

		if (fs.existsSync(custom_autocomplete_file_path)) {
			debugLog("loadCustomAutocompleteList(): " + custom_autocomplete_file_name + " exists, will load it now.");
			const custom_autocomplete_content = fs.readFileSync(custom_autocomplete_file_path).toLocaleString();
			const result = addCustomAutocompleteItems(custom_autocomplete_content)
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

	private async disablePlugin() {
		// This unfortunately accesses a private API.
		// @ts-ignore
		await this.app.plugins.disablePlugin(this.manifest.id);
	}

	/**
	 * @return string Returns "0" if there are no shell commands yet, otherwise returns the max ID + 1, as a string.
	 */
	private generateNewShellCommandID() {
		const existing_ids = Object.getOwnPropertyNames(this.getTShellCommands());
		let new_id = 0;
		for (const i in existing_ids) {
			const existing_id = parseInt(existing_ids[i]);
			if (existing_id >= new_id) {
				new_id = existing_id + 1;
			}
		}
		return String(new_id);
	}

	public getPluginId() {
		return this.manifest.id;
	}

	public getPluginName() {
		return this.manifest.name;
	}

	public newError(message: string) {
		new Notice(message, this.settings.error_message_duration * 1000); // * 1000 = convert seconds to milliseconds.
	}

	public newErrors(messages: string[]) {
		messages.forEach((message: string) => {
			this.newError(message);
		});
	}

	public newNotification(message: string) {
		new Notice(message, this.settings.notification_message_duration * 1000); // * 1000 = convert seconds to milliseconds.
	}

	public getDefaultShell(): string {
		const operating_system = getOperatingSystem();
		let shell_name = this.settings.default_shells[operating_system]; // Can also be undefined.
		if (undefined === shell_name) {
			shell_name = getUsersDefaultShell();
		}
		return shell_name;
	}
}


