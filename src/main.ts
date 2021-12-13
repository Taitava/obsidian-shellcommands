import {Command, Notice, Plugin} from 'obsidian';
import {exec, ExecException, ExecOptions} from "child_process";
import {combineObjects, getOperatingSystem, getPluginAbsolutePath, getVaultAbsolutePath} from "./Common";
import {parseShellCommandVariables} from "./variables/parseShellCommandVariables";
import {RunMigrations} from "./Migrations";
import {
	newShellCommandConfiguration,
	ShellCommandsConfiguration
} from "./settings/ShellCommandConfiguration";
import {
	getDefaultSettings,
	SettingsVersionString,
	ShellCommandsPluginSettings,
} from "./settings/ShellCommandsPluginSettings";
import {ObsidianCommandsContainer} from "./ObsidianCommandsContainer";
import {ShellCommandsSettingsTab} from "./settings/ShellCommandsSettingsTab";
import * as path from "path";
import * as fs from "fs";
import {ConfirmExecutionModal} from "./ConfirmExecutionModal";
import {handleShellCommandOutput} from "./output_channels/OutputChannelDriverFunctions";
import {BaseEncodingOptions} from "fs";
import {TShellCommand, TShellCommandContainer} from "./TShellCommand";
import {getUsersDefaultShell, isShellSupported} from "./Shell";
import {TShellCommandTemporary} from "./TShellCommandTemporary";
import {versionCompare} from "./lib/version_compare";
import {debugLog, setDEBUG_ON} from "./Debug";
import {addCustomAutocompleteItems} from "./settings/setting_elements/Autocomplete";
import {SC_Event} from "./events/SC_Event";

export default class ShellCommandsPlugin extends Plugin {
	/**
	 * Defines the settings structure version. Change this when a new plugin version is released, but only if that plugin
	 * version introduces changes to the settings structure. Do not change if the settings structure stays unchanged.
	 */
	public static SettingsVersion: SettingsVersionString = "0.8.0";

	settings: ShellCommandsPluginSettings;
	obsidian_commands: ObsidianCommandsContainer = {};
	private t_shell_commands: TShellCommandContainer = {};

	/**
	 * Temporary holder for ShellCommandConfigurations whose variables are already parsed before the actual execution during command palette preview.
	 * This array gets emptied after every shell command execution.
	 *
	 * @private
	 */
	private preparsed_t_shell_commands: TShellCommandContainer = {};

	async onload() {
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

		// Generate TShellCommand objects from configuration (only after configuration migrations are done)
		this.loadTShellCommands();

		// Shell command registrations:
		//  - Make all defined shell commands to appear in the Obsidian command palette.
		//  - Perform event registrations.
		const shell_commands = this.getTShellCommands();
		for (let shell_command_id in shell_commands) {
			const t_shell_command = shell_commands[shell_command_id];
			this.registerShellCommand(t_shell_command);
			t_shell_command.registerSC_Events();
		}

		// Load a custom autocomplete list if it exists.
		this.loadCustomAutocompleteList();

		this.addSettingTab(new ShellCommandsSettingsTab(this.app, this));
	}

	private loadTShellCommands() {
		this.t_shell_commands = {};
		let shell_command_configurations = this.getShellCommandConfigurations();

		for (let shell_command_id in shell_command_configurations) {
			this.t_shell_commands[shell_command_id] = new TShellCommand(this, shell_command_id, shell_command_configurations[shell_command_id]);
		}
	}

	getTShellCommands() {
		return this.t_shell_commands;
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
		this.t_shell_commands[shell_command_id] = new TShellCommand(this, shell_command_id, shell_command_configuration);
		this.registerShellCommand(this.t_shell_commands[shell_command_id]);
		return this.t_shell_commands[shell_command_id];
	}

	/**
	 * @param t_shell_command
	 */
	private registerShellCommand(t_shell_command: TShellCommand) {
		let shell_command_id = t_shell_command.getId();
		debugLog("Registering shell command #" + shell_command_id + "...");
		let obsidian_command: Command = {
			id: this.generateObsidianCommandId(shell_command_id),
			name: this.generateObsidianCommandName(t_shell_command),
			// Use 'checkCallback' instead of normal 'callback' because we also want to get called when the command palette is opened.
			checkCallback: (is_opening_command_palette) => {
				if (is_opening_command_palette) {
					// The user is currently opening the command palette.
					// Do not execute the command yet, but parse variables for preview, if enabled in the settings.
					debugLog("Getting command palette preview for shell command #" + t_shell_command.getId());
					if (this.settings.preview_variables_in_command_palette) {
						let preparsed_t_shell_command: TShellCommandTemporary = TShellCommandTemporary.fromTShellCommand(t_shell_command); // Clone t_shell_command so that we won't edit the original configuration.

						// Parse variables in the actual shell command
						let parsed_shell_command = parseShellCommandVariables(this, preparsed_t_shell_command.getShellCommand(), preparsed_t_shell_command.getShell());
						if (Array.isArray(parsed_shell_command)) {
							// Variable parsing failed, because an array was returned, which contains error messages.
							// Just cancel the preview, the command will be shown with variable names. Discard the error messages.
							debugLog("Shell command preview: Variable parsing failed for shell command " + preparsed_t_shell_command.getShellCommand());
							return true;
						} else {
							// Variable parsing succeeded.
							// Use the parsed values.
							preparsed_t_shell_command.getConfiguration().platform_specific_commands = {default: parsed_shell_command}; // Overrides all possible OS specific shell command versions.
						}

						// Also parse variables in an alias, in case the command has one. Variables in aliases do not do anything practical, but they can reveal the user what variables are used in the command.
						let parsed_alias = parseShellCommandVariables(this, preparsed_t_shell_command.getAlias(), preparsed_t_shell_command.getShell());
						if (Array.isArray(parsed_alias)) {
							// Variable parsing failed, because an array was returned, which contains error messages.
							// Just cancel the preview, the alias will be shown with variable names. Discard the error messages.
							debugLog("Shell command preview: Variable parsing failed for alias " + preparsed_t_shell_command.getAlias());
							return true;
						} else {
							// Variable parsing succeeded.
							// Use the parsed values.
							preparsed_t_shell_command.getConfiguration().alias = parsed_alias;
						}

						// Rename the command in command palette
						let prefix = this.getPluginName() + ": "; // Normally Obsidian prefixes all commands with the plugin name automatically, but now that we are actually _editing_ a command in the palette (not creating a new one), Obsidian won't do the prefixing for us.
						obsidian_command.name = prefix + this.generateObsidianCommandName(preparsed_t_shell_command);

						// Store the preparsed shell command so that we can use exactly the same values if the command gets later executed.
						this.preparsed_t_shell_commands[shell_command_id] = preparsed_t_shell_command;
					}
					return true; // Need to return true, otherwise the command would be left out from the command palette.

				} else {
					// The user has instructed to execute the command.
					// Check if we happen to have a preparsed command (= variables parsed at the time of opening the command palette)
					if (undefined === this.preparsed_t_shell_commands[shell_command_id]) {
						// No preparsed command. Execute a standard version of the command, and do variable parsing now.
						let parsed_shell_command = parseShellCommandVariables(this, t_shell_command.getShellCommand(), t_shell_command.getShell());
						if (Array.isArray(parsed_shell_command)) {
							// The command could not be parsed correctly.
							// Display error messages
							this.newErrors(parsed_shell_command);
						} else {
							// The command was parsed correctly.
							this.confirmAndExecuteShellCommand(parsed_shell_command, t_shell_command);
						}

					} else {
						// We do have a preparsed version of this command.
						// No need to check if the parsing had previously succeeded, because if it would have failed, the command would not be in the preparsed commands' array.
						this.confirmAndExecuteShellCommand(this.preparsed_t_shell_commands[shell_command_id].getShellCommand(), t_shell_command);
					}

					// Delete the whole array of preparsed commands. Even though we only used just one command from it, we need to notice that opening a command
					// palette might generate multiple preparsed commands in the array, but as the user selects and executes only one command, all these temporary
					// commands are now obsolete. Delete them just in case the user toggles the variable preview feature off in the settings. We do not want to
					// execute obsolete commands accidentally. This deletion also needs to be done even if the executed command was not a preparsed command, because
					// even when preparsing is turned on in the settings, singular commands may fail to parse and therefore they would not be in this array, but other
					// commands might be.
					this.resetPreparsedShellCommandConfigurations();
				}
			}
		};
		this.addCommand(obsidian_command)
		this.obsidian_commands[shell_command_id] = obsidian_command; // Store the reference so that we can edit the command later in ShellCommandsSettingsTab if needed.
		debugLog("Registered.")
	}

	/**
	 * Called when it's known that preparsed shell command variables have old data and should not be used later.
	 */
	resetPreparsedShellCommandConfigurations() {
		this.preparsed_t_shell_commands = {};
	}

	/**
	 * Called after turning "Preview variables in command palette" setting off, to make sure that all shell commands have {{variable}} names visible instead of their values.
	 */
	resetCommandPaletteNames() {
		let shell_commands = this.getTShellCommands();
		for (let shell_command_id in shell_commands) {
			let t_shell_command = shell_commands[shell_command_id];
			this.obsidian_commands[shell_command_id].name = this.generateObsidianCommandName(t_shell_command);
		}
	}

	generateObsidianCommandId(shell_command_id: string) {
		return "shell-command-" + shell_command_id;
	}

	generateObsidianCommandName(t_shell_command: TShellCommand) {
		let prefix = "Execute: ";
		if (t_shell_command.getAlias()) {
			// If an alias is set for the command, Obsidian's command palette should display the alias text instead of the actual command.
			return prefix + t_shell_command.getAlias();
		}
		return prefix + t_shell_command.getShellCommand();
	}

	/**
	 *
	 * @param shell_command The actual shell command that will be executed.
	 * @param t_shell_command Used for reading other properties. t_shell_command.shell_command won't be used!
	 */
	confirmAndExecuteShellCommand(shell_command: string, t_shell_command: TShellCommand) {

		// Check if the command needs confirmation before execution
		if (t_shell_command.getConfirmExecution()) {
			// Yes, a confirmation is needed.
			// Open a confirmation modal.
			new ConfirmExecutionModal(this, shell_command, t_shell_command)
				.open()
			;
			return; // Do not execute now. The modal will call executeShellCommand() later if needed.
		} else {
			// No need to confirm.
			// Execute.
			this.executeShellCommand(shell_command, t_shell_command);
		}
	}

	/**
	 * Does not ask for confirmation before execution. This should only be called if: a) a confirmation is already asked from a user, or b) this command is defined not to need a confirmation.
	 * Use confirmAndExecuteShellCommand() instead to have a confirmation asked before the execution.
	 *
	 * @param shell_command The actual shell command that will be executed.
	 * @param t_shell_command Used for reading other properties. t_shell_command.shell_command won't be used!
	 */
	executeShellCommand(shell_command: string, t_shell_command: TShellCommand) {
		let working_directory = this.getWorkingDirectory();

		// Check that the shell command is not empty
		shell_command = shell_command.trim();
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
			let options: BaseEncodingOptions & ExecOptions = {
				"cwd": working_directory,
				"shell": shell,
			};

			// Execute the shell command
			debugLog("Executing command " + shell_command + " in " + working_directory + "...");
			exec(shell_command, options, (error: ExecException|null, stdout: string, stderr: string) => {
				if (null !== error) {
					// Some error occurred
					debugLog("Command executed and failed. Error number: " + error.code + ". Message: " + error.message);

					// Check if this error should be displayed to the user or not
					if (t_shell_command.getIgnoreErrorCodes().contains(error.code)) {
						// The user has ignored this error.
						debugLog("User has ignored this error, so won't display it.");

						// Handle only stdout output stream
						handleShellCommandOutput(this, t_shell_command, stdout, "", null);
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
						handleShellCommandOutput(this, t_shell_command, stdout, stderr, error.code);
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
					handleShellCommandOutput(this, t_shell_command, stdout, stderr, 0); // Use zero as an error code instead of null (0 means no error). If stderr happens to contain something, exit code 0 gets displayed in an error balloon (if that is selected as a driver for stderr).
				}
			});
		}
	}

	getWorkingDirectory() {
		// Returns either a user defined working directory, or an automatically detected one.
		let working_directory = this.settings.working_directory;
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

	onunload() {
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
			const version_comparison = versionCompare(ShellCommandsPlugin.SettingsVersion, current_settings_version);
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

	async loadSettings() {

		// Try to read a settings file
		let all_settings: ShellCommandsPluginSettings;
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

	async saveSettings() {
		// Update settings version in case it's old.
		this.settings.settings_version = ShellCommandsPlugin.SettingsVersion;

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
	generateNewShellCommandID() {
		let existing_ids = Object.getOwnPropertyNames(this.getTShellCommands());
		let new_id = 0;
		for (let i in existing_ids) {
			let existing_id = parseInt(existing_ids[i]);
			if (existing_id >= new_id) {
				new_id = existing_id + 1;
			}
		}
		return String(new_id);
	}

	getPluginId() {
		return this.manifest.id;
	}

	getPluginName() {
		return this.manifest.name;
	}

	newError(message: string) {
		new Notice(message, this.settings.error_message_duration * 1000); // * 1000 = convert seconds to milliseconds.
	}

	newErrors(messages: string[]) {
		messages.forEach((message: string) => {
			this.newError(message);
		});
	}

	newNotification(message: string) {
		new Notice(message, this.settings.notification_message_duration * 1000); // * 1000 = convert seconds to milliseconds.
	}

	public getDefaultShell(): string {
		let operating_system = getOperatingSystem()
		let shell_name = this.settings.default_shells[operating_system]; // Can also be undefined.
		if (undefined === shell_name) {
			shell_name = getUsersDefaultShell();
		}
		return shell_name;
	}
}


