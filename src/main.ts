import {Command, Notice, Plugin} from 'obsidian';
import {exec, ExecException} from "child_process";
import {cloneObject, getVaultAbsolutePath} from "./Common";
import {parseShellCommandVariables} from "./variables/parseShellCommandVariables";
import {RunMigrations} from "./Migrations";
import {
	ShellCommandConfiguration,
	ShellCommandsConfiguration
} from "./settings/ShellCommandConfiguration";
import {DEFAULT_SETTINGS, ShellCommandsPluginSettings} from "./settings/ShellCommandsPluginSettings";
import {ObsidianCommandsContainer} from "./ObsidianCommandsContainer";
import {ShellCommandsSettingsTab} from "./settings/ShellCommandsSettingsTab";
import * as path from "path";
import * as fs from "fs";
import {ConfirmExecutionModal} from "./ConfirmExecutionModal";
import {handleShellCommandOutput} from "./output_channels/OutputChannelDriverFunctions";

export default class ShellCommandsPlugin extends Plugin {
	settings: ShellCommandsPluginSettings;
	obsidian_commands: ObsidianCommandsContainer = {};

	/**
	 * Temporary holder for ShellCommandConfigurations whose variables are already parsed before the actual execution during command palette preview.
	 * This array gets emptied after every shell command execution.
	 *
	 * @private
	 */
	private preparsed_shell_command_configurations: ShellCommandsConfiguration = {};

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		// Run possible configuration migrations
		await RunMigrations(this);

		// Make all defined shell commands to appear in the Obsidian command list
		let shell_commands = this.getShellCommands();
		for (let command_id in shell_commands) {
			let shell_command_configuration = shell_commands[command_id];
			this.registerShellCommand(command_id, shell_command_configuration);
		}

		this.addSettingTab(new ShellCommandsSettingsTab(this.app, this));
	}

	getShellCommands() {
		return this.settings.shell_commands;
	}

	/**
	 *
	 * @param command_id string, but in practise it's a number in a string format, e.g. "0" or "1" etc.
	 * @param shell_command_configuration
	 */
	registerShellCommand(command_id: string, shell_command_configuration: ShellCommandConfiguration) {
		console.log("Registering shell command #" + command_id + " (" + shell_command_configuration.shell_command + ") to Obsidian...");
		let obsidian_command: Command = {
			id: this.generateObsidianCommandId(command_id),
			name: this.generateObsidianCommandName(shell_command_configuration),
			// Use 'checkCallback' instead of normal 'callback' because we also want to get called when the command palette is opened.
			checkCallback: (is_opening_command_palette) => {
				if (is_opening_command_palette) {
					// The user is currently opening the command palette.
					// Do not execute the command yet, but parse variables for preview, if enabled in the settings.
					if (this.settings.preview_variables_in_command_palette) {
						let preparsed_shell_command_configuration: ShellCommandConfiguration = cloneObject(shell_command_configuration); // Clone shell_command_configuration so that we won't edit the original object.

						// Parse variables in the actual shell command
						let parsed_shell_command = parseShellCommandVariables(this, preparsed_shell_command_configuration.shell_command);
						if (Array.isArray(parsed_shell_command)) {
							// Variable parsing failed, because an array was returned, which contains error messages.
							// Just cancel the preview, the command will be shown with variable names. Discard the error messages.
							console.log("Shell command preview: Variable parsing failed for shell command " + preparsed_shell_command_configuration.shell_command);
							return true;
						} else {
							// Variable parsing succeeded.
							// Use the parsed values.
							preparsed_shell_command_configuration.shell_command = parsed_shell_command;
						}

						// Also parse variables in an alias, in case the command has one. Variables in aliases do not do anything practical, but they can reveal the user what variables are used in the command.
						let parsed_alias = parseShellCommandVariables(this, preparsed_shell_command_configuration.alias);
						if (Array.isArray(parsed_alias)) {
							// Variable parsing failed, because an array was returned, which contains error messages.
							// Just cancel the preview, the alias will be shown with variable names. Discard the error messages.
							console.log("Shell command preview: Variable parsing failed for alias " + preparsed_shell_command_configuration.alias);
							return true;
						} else {
							// Variable parsing succeeded.
							// Use the parsed values.
							preparsed_shell_command_configuration.alias = parsed_alias;
						}

						// Rename the command in command palette
						let prefix = this.getPluginName() + ": "; // Normally Obsidian prefixes all commands with the plugin name automatically, but now that we are actually _editing_ a command in the palette (not creating a new one), Obsidian won't do the prefixing for us.
						obsidian_command.name = prefix + this.generateObsidianCommandName(preparsed_shell_command_configuration);

						// Store the preparsed shell command so that we can use exactly the same values if the command gets later executed.
						this.preparsed_shell_command_configurations[command_id] = preparsed_shell_command_configuration;
					}
					return true; // Need to return true, otherwise the command would be left out from the command palette.

				} else {
					// The user has instructed to execute the command.
					// Check if we happen to have a preparsed command (= variables parsed at the time of opening the command palette)
					if (undefined === this.preparsed_shell_command_configurations[command_id]) {
						// No preparsed command. Execute a standard version of the command, and do variable parsing now.
						let parsed_shell_command = parseShellCommandVariables(this, shell_command_configuration.shell_command);
						if (Array.isArray(parsed_shell_command)) {
							// The command could not be parsed correctly.
							// Display error messages
							this.newErrors(parsed_shell_command);
						} else {
							// The command was parsed correctly.
							this.confirmAndExecuteShellCommand(parsed_shell_command, shell_command_configuration);
						}

					} else {
						// We do have a preparsed version of this command.
						// No need to check if the parsing had previously succeeded, because if it would have failed, the command would not be in the preparsed commands' array.
						this.confirmAndExecuteShellCommand(this.preparsed_shell_command_configurations[command_id].shell_command, shell_command_configuration);
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
		this.obsidian_commands[command_id] = obsidian_command; // Store the reference so that we can edit the command later in ShellCommandsSettingsTab if needed.
		console.log("Registered.")
	}

	/**
	 * Called when it's known that preparsed shell command variables have old data and should not be used later.
	 */
	resetPreparsedShellCommandConfigurations() {
		this.preparsed_shell_command_configurations = {};
	}

	/**
	 * Called after turning "Preview variables in command palette" setting off, to make sure that all shell commands have {{variable}} names visible instead of their values.
	 */
	resetCommandPaletteNames() {
		let shell_commands = this.getShellCommands();
		for (let shell_command_id in shell_commands) {
			let shell_command_configuration = shell_commands[shell_command_id];
			this.obsidian_commands[shell_command_id].name = this.generateObsidianCommandName(shell_command_configuration);
		}
	}

	generateObsidianCommandId(shell_command_id: string) {
		return "shell-command-" + shell_command_id;
	}

	generateObsidianCommandName(shell_command_configuration: ShellCommandConfiguration) {
		let prefix = "Execute: ";
		if (shell_command_configuration.alias) {
			// If an alias is set for the command, Obsidian's command palette should display the alias text instead of the actual command.
			return prefix + shell_command_configuration.alias;
		}
		return prefix + shell_command_configuration.shell_command;
	}

	/**
	 *
	 * @param shell_command The actual shell command that will be executed.
	 * @param shell_command_configuration Used for reading other properties. shell_command_configuration.shell_command won't be used!
	 */
	confirmAndExecuteShellCommand(shell_command: string, shell_command_configuration: ShellCommandConfiguration) {

		// Check if the command needs confirmation before execution
		if (shell_command_configuration.confirm_execution) {
			// Yes, a confirmation is needed.
			// Open a confirmation modal.
			new ConfirmExecutionModal(this, shell_command, shell_command_configuration)
				.open()
			;
			return; // Do not execute now. The modal will call executeShellCommand() later if needed.
		} else {
			// No need to confirm.
			// Execute.
			this.executeShellCommand(shell_command, shell_command_configuration);
		}
	}

	/**
	 * Does not ask for confirmation before execution. This should only be called if: a) a confirmation is already asked from a user, or b) this command is defined not to need a confirmation.
	 * Use confirmAndExecuteShellCommand() instead to have a confirmation asked before the execution.
	 *
	 * @param shell_command The actual shell command that will be executed.
	 * @param shell_command_configuration Used for reading other properties. shell_command_configuration.shell_command won't be used!
	 */
	executeShellCommand(shell_command: string, shell_command_configuration: ShellCommandConfiguration) {
		let working_directory = this.getWorkingDirectory();

		// Check that the shell command is not empty
		shell_command = shell_command.trim();
		if (!shell_command.length) {
			// It is empty
			console.log("The shell command is empty. :(");
			this.newError("The shell command is empty :(");
			return;
		}

		// Check that the working directory exists and is a folder
		if (!fs.existsSync(working_directory)) {
			// Working directory does not exist
			// Prevent execution
			console.log("Working directory does not exist: " + working_directory);
			this.newError("Working directory does not exist: " + working_directory);
		}
		else if (!fs.lstatSync(working_directory).isDirectory()) {
			// Working directory is not a directory.
			// Prevent execution
			console.log("Working directory exists but is not a folder: " + working_directory);
			this.newError("Working directory exists but is not a folder: " + working_directory);
		} else {
			// Working directory is OK
			// Execute the shell command
			console.log("Executing command " + shell_command + " in " + working_directory + "...");
			exec(shell_command, {
				"cwd": working_directory
			}, (error: ExecException|null, stdout: string, stderr: string) => {
				if (null !== error) {
					// Some error occurred
					console.log("Command executed and failed. Error number: " + error.code + ". Message: " + error.message);

					// Check if this error should be displayed to the user or not
					if (shell_command_configuration.ignore_error_codes.contains(error.code)) {
						// The user has ignored this error.
						console.log("User has ignored this error, so won't display it.");

						// Handle only stdout output stream
						handleShellCommandOutput(this, shell_command_configuration, stdout, "", null);
					} else {
						// Show the error.
						console.log("Will display the error to user.");

						// Handle both stdout and stderr output streams
						handleShellCommandOutput(this, shell_command_configuration, stdout, stderr, error.code);
					}
				} else {
					// No errors
					console.log("Command executed without errors.")

					// Handle output
					handleShellCommandOutput(this, shell_command_configuration, stdout, stderr, null);
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
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * @return string Returns "0" if there are no shell commands yet, otherwise returns the max ID + 1, as a string.
	 */
	generateNewShellCommandID() {
		let existing_ids = Object.getOwnPropertyNames(this.getShellCommands());
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

	newNotice(message: string) {
		new Notice(message); // Use Obsidian's default timeout for notices.
	}
}


