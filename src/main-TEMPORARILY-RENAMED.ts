import {App, Command, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {exec, ExecException} from "child_process";
import {cloneObject, getVaultAbsolutePath, isWindows} from "../Common";
import {getShellCommandVariableInstructions, parseShellCommandVariables} from "../ShellCommandVariableParser";
import {RunMigrations} from "../Migrations";
import {
	newShellCommandConfiguration,
	ShellCommandConfiguration,
	ShellCommandsConfiguration
} from "../ShellCommandConfiguration";

export default class ShellCommandsPlugin extends Plugin {
	/**
	 * TODO: Is there a way to get the plugin name information from Obsidian API somehow?
	 * @private
	 */
	private static PluginName = "Shell commands";

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
			id: "shell-command-" + command_id,
			name: this.generateObsidianCommandName(shell_command_configuration),
			// Use 'checkCallback' instead of normal 'callback' because we also want to get called when the command palette is opened.
			checkCallback: (is_opening_command_palette) => {
				if (is_opening_command_palette) {
					// The user is currently opening the command palette.
					// Do not execute the command yet, but parse variables for preview, if enabled in the settings.
					if (this.settings.preview_variables_in_command_palette) {
						let preparsed_shell_command_configuration: ShellCommandConfiguration = cloneObject(shell_command_configuration); // Clone shell_command_configuration so that we won't edit the original object.

						// Parse variables in the actual shell command
						let parsed_shell_command = parseShellCommandVariables(this, preparsed_shell_command_configuration.shell_command, false);
						if (null === parsed_shell_command) {
							// Variable parsing failed.
							// Just cancel the preview, the command will be shown with variable names.
							console.log("Shell command preview: Variable parsing failed for shell command " + preparsed_shell_command_configuration.shell_command);
							return true;
						} else {
							// Variable parsing succeeded.
							// Use the parsed values.
							preparsed_shell_command_configuration.shell_command = parsed_shell_command;
						}

						// Also parse variables in an alias, in case the command has one. Variables in aliases do not do anything practical, but they can reveal the user what variables are used in the command.
						let parsed_alias = parseShellCommandVariables(this, preparsed_shell_command_configuration.alias, false);
						if (null === parsed_alias) {
							// Variable parsing failed.
							// Just cancel the preview, the command will be shown with variable names.
							console.log("Shell command preview: Variable parsing failed for alias " + preparsed_shell_command_configuration.alias);
							return true;
						} else {
							// Variable parsing succeeded.
							// Use the parsed values.
							preparsed_shell_command_configuration.alias = parsed_alias;
						}

						// Rename the command in command palette
						let prefix = ShellCommandsPlugin.PluginName + ": "; // Normally Obsidian prefixes all commands with the plugin name automatically, but now that we are actually _editing_ a command in the palette (not creating a new one), Obsidian won't do the prefixing for us.
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
						let parsed_shell_command = parseShellCommandVariables(this, shell_command_configuration.shell_command, true);
						if (null === parsed_shell_command) {
							// The command could not be parsed correctly.
							console.log("Parsing command " + shell_command_configuration.shell_command + " failed.");
							// No need to create a notice here, because the parsing process creates notices every time something goes wrong.
						} else {
							// The command was parsed correctly.
							this.executeShellCommand(parsed_shell_command);
						}

					} else {
						// We do have a preparsed version of this command.
						// No need to check if the parsing had previously succeeded, because if it would have failed, the command would not be in the preparsed commands' array.
						this.executeShellCommand(this.preparsed_shell_command_configurations[command_id].shell_command);
					}

					// Delete the whole array of preparsed commands. Even though we only used just one command from it, we need to notice that opening a command
					// palette might generate multiple preparsed commands in the array, but as the user selects and executes only one command, all these temporary
					// commands are now obsolete. Delete them just in case the user toggles the variable preview feature off in the settings. We do not want to
					// execute obsolete commands accidentally. This deletion also needs to be done even if the executed command was not a preparsed command, because
					// even when preparsing is turned on in the settings, singular commands may fail to parse and therefore they would not be in this array, but other
					// commands might be.
					this.preparsed_shell_command_configurations = {};
				}
			}
		};
		this.addCommand(obsidian_command)
		this.obsidian_commands[command_id] = obsidian_command; // Store the reference so that we can edit the command later in ShellCommandsSettingsTab if needed.
		console.log("Registered.")
	}

	generateObsidianCommandName(shell_command_configuration: ShellCommandConfiguration) {
		let prefix = "Execute: ";
		if (shell_command_configuration.alias) {
			// If an alias is set for the command, Obsidian's command palette should display the alias text instead of the actual command.
			return prefix + shell_command_configuration.alias;
		}
		return prefix + shell_command_configuration.shell_command;
	}

	executeShellCommand(shell_command: string) {
		console.log("Executing command "+shell_command+" in "+this.getWorkingDirectory() + "...");
		exec(shell_command, {
			"cwd": this.getWorkingDirectory()
		}, (error: (ExecException|null)) => {
			if (null !== error) {
				// Some error occurred
				console.log("Command executed and failed. Error number: " + error.code + ". Message: " + error.message);
				this.newError("[" + error.code + "]: " + error.message);
			} else {
				// No errors
				console.log("Command executed without errors.")
			}
		});
	}

	getWorkingDirectory() {
		// Returns either a user defined working directory, or an automatically detected one.
		let working_directory = this.settings.working_directory;
		if (working_directory.length == 0) {
			return getVaultAbsolutePath(this.app);
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

	newError(message: string) {
		new Notice(message, this.settings.error_message_duration * 1000); // * 1000 = convert seconds to milliseconds.
	}

	newNotice(message: string) {
		new Notice(message); // Use Obsidian's default timeout for notices.
	}
}


