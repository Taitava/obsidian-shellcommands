import {App, Command, Modal, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {exec, ExecException} from "child_process";
import {getVaultAbsolutePath, isWindows} from "./Common";
import {getShellCommandVariableInstructions, parseShellCommandVariables} from "./ShellCommandVariableParser";
import {RunMigrations} from "./Migrations";

// SETTINGS AND DEFAULT VALUES
interface ShellCommandsPluginSettings {
	working_directory: string;
	shell_commands: ShellCommandsConfiguration;

	// Legacy:
	/** @deprecated Use shell_commands object instead of this array. From now on, this array can be used only for migrating old configuration to shell_commands.*/
	commands: string[];
}
const DEFAULT_SETTINGS: ShellCommandsPluginSettings = {
	working_directory: "",
	shell_commands: {},

	// Legacy:
	commands: [] // Deprecated, but must be present in the default values as long as migrating from commands to shell_commands is supported.
}

interface ShellCommandsConfiguration {
	[key: string]: ShellCommandConfiguration;
}

export interface ShellCommandConfiguration { // Migrations.ts uses this also.
	shell_command: string;
	alias: string;
}

/**
 * Exported because Migrations.ts uses this too.
 *
 * @param shell_command
 */
export function newShellCommandConfiguration(shell_command: string = ""): ShellCommandConfiguration {
	return {
		shell_command: shell_command,
		alias: ""
	}
}

interface ObsidianCommandsContainer {
	[key: string]: Command;
}

export default class ShellCommandsPlugin extends Plugin {
	settings: ShellCommandsPluginSettings;
	obsidian_commands: ObsidianCommandsContainer = {};

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
			callback: () => {
				this.executeShellCommand(shell_command_configuration);
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

	executeShellCommand(shell_command_configuration: ShellCommandConfiguration) {
		let parsed_command = parseShellCommandVariables(this.app, shell_command_configuration.shell_command, true);
		if (null === parsed_command) {
			// The command could not be parsed correctly.
			console.log("Parsing command " + shell_command_configuration.shell_command + " failed.");
			// No need to create a notice here, because the parsing process creates notices every time something goes wrong.
		} else {
			// The command was parsed correctly.
			console.log("Executing command "+parsed_command+" in "+this.getWorkingDirectory() + "...");
			exec(parsed_command, {
				"cwd": this.getWorkingDirectory()
			}, (error: (ExecException|null)) => {
				if (null !== error) {
					// Some error occurred
					console.log("Command executed and failed. Error number: " + error.code + ". Message: " + error.message);
					new Notice("[" + error.code + "]: " + error.message);
				} else {
					// No errors
					console.log("Command executed without errors.")
				}
			});
		}
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
}

class ShellCommandsSettingsTab extends PluginSettingTab {
	plugin: ShellCommandsPlugin;

	constructor(app: App, plugin: ShellCommandsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: "Shell commands"});

		// "Working directory" field
		new Setting(containerEl)
			.setName("Working directory")
			.setDesc("Enter a directory where your commands will be run. If empty, defaults to your vault's location.")
			.addText(text => text
				.setPlaceholder(getVaultAbsolutePath(this.app))
				.setValue(this.plugin.settings.working_directory)
				.onChange(async (value) => {
					console.log("Changing working_directory to " + value);
					this.plugin.settings.working_directory = value;
					await this.plugin.saveSettings();
				})
			)

		// Tips when the user has already defined some commands
		if (Object.keys(this.plugin.getShellCommands()).length > 0) {
			containerEl.createEl('p', {text: "To remove a command, clear its text field and click \"Apply deletions\"."});
			if (isWindows()) containerEl.createEl('p', {text: "Tip for Windows: If you get an error starting with \"[259]: Command failed:\" even though the execution works ok, you can try to prefix your command with \"start \". E.g. \"start git-gui\"."});
		}

		// A <div> element for all command input fields. New command fields can be created at the bottom of this element.
		let command_fields_container = containerEl.createEl("div");

		// Fields for modifying existing commands
		for (let command_id in this.plugin.getShellCommands()) {
			this.createCommandField(command_fields_container, command_id);
		}

		// "Apply deletions" button
		new Setting(containerEl)
			.setDesc("Click this when you have deleted any commands (= cleared command text fields). Other changes are applied automatically.")
			.addButton(button => button
				.setButtonText("APPLY DELETIONS")
				.onClick(async () => {
					console.log("Updating shell command settings concerning deleted commands...")
					let count_deletions = 0;
					for (let command_id in this.plugin.getShellCommands()) {
						let shell_command = this.plugin.getShellCommands()[command_id].shell_command;
						if (shell_command.length == 0 && "new" !== command_id) {
							// Remove a command
							console.log("Command " + command_id + " gonna be removed.");
							delete this.plugin.getShellCommands()[command_id]; // Remove from the plugin's settings.
							delete this.plugin.obsidian_commands[command_id]; // Remove from the command palette.
							count_deletions++;

							console.log("Command removed.");
						}
					}
					await this.plugin.saveSettings();
					console.log("Shell command settings updated.");
					if (0 === count_deletions) {
						new Notice("Nothing to delete :)");
					} else {
						new Notice("Deleted " + count_deletions + " shell command(s)!");
					}
				})
			)
		;

		// "New command" button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText("New command")
				.onClick(async () => {
					this.createCommandField(command_fields_container, "new");
					console.log("New empty command created.");
				})
			)
		;

		// Variable instructions
		containerEl.createEl("h2", {text: "Variables"});
		getShellCommandVariableInstructions().forEach((instructions) => {
			let paragraph = containerEl.createEl("p");
			// @ts-ignore
			paragraph.createEl("strong", {text: instructions.variable_name + " "});
			// @ts-ignore
			paragraph.createEl("span", {text: instructions.instructions});
		});
		containerEl.createEl("p", {text: "When you type variables into commands, a preview text appears under the command field to show how the command will look like when it gets executed with variables substituted with their real values."})
		containerEl.createEl("p", {text: "There is no way to escape variable parsing. If you need {{ }} characters in your command, they won't be parsed as variables as long as they do not contain any of the variable names listed below. If you would need to pass e.g. {{title}} literally to your command, there is no way to do it atm, please raise an issue in GitHub."})
		containerEl.createEl("p", {text: "All variables that access the current file, may cause the command preview to fail if you had no file panel active when you opened the settings window - e.g. you had focus on graph view instead of a note = no file is currently active. But this does not break anything else than the preview."})
	}

	/**
	 *
	 * @param container_element
	 * @param shell_command_id Either a string formatted integer ("0", "1" etc) or "new" if it's a field for a command that does not exist yet.
	 */
	createCommandField(container_element: HTMLElement, shell_command_id: string) {
		let is_new = "new" === shell_command_id;
		let shell_command_configuration: ShellCommandConfiguration;
		if (is_new) {
			// Create an empty command
			shell_command_id = this.plugin.generateNewShellCommandID();
			shell_command_configuration = newShellCommandConfiguration();
			this.plugin.getShellCommands()[shell_command_id] = shell_command_configuration;
		} else {
			// Use an old shell command
			shell_command_configuration = this.plugin.getShellCommands()[shell_command_id];
		}
		console.log("Create command field for command #" + shell_command_id + (is_new ? " (NEW)" : ""));
		let shell_command: string;
		if (is_new) {
			shell_command = "";
		} else {
			shell_command = shell_command_configuration.shell_command;
		}
		let setting = new Setting(container_element)
			.setName(this.generateCommandFieldName(shell_command_id, this.plugin.getShellCommands()[shell_command_id]))
			.setDesc(this.getShellCommandPreview(shell_command))
			.addText(text => text
				.setPlaceholder("Enter your command")
				.setValue(shell_command)
				.onChange(async (field_value) => {
					let shell_command = field_value;
					setting.setDesc(this.getShellCommandPreview(shell_command));

					if (is_new) {
						console.log("Creating new command " + shell_command_id + ": " + shell_command);
					}
					else {
						console.log("Command " + shell_command_id + " gonna change to: " + shell_command);
					}

					// Do this in both cases, when creating a new command and when changing an old one:
					shell_command_configuration.shell_command = shell_command;

					if (is_new) {
						// Create a new command
						this.plugin.registerShellCommand(shell_command_id, shell_command_configuration);
						console.log("Command created.");
					} else {
						// Change an old command
						this.plugin.obsidian_commands[shell_command_id].name = this.plugin.generateObsidianCommandName(this.plugin.getShellCommands()[shell_command_id]); // Change the command's name in Obsidian's command palette.
						console.log("Command changed.");
					}
					await this.plugin.saveSettings();
				})
			)
			.addExtraButton(button => button
				.setTooltip("Define an alias")
				.onClick(async () => {
					// Open an alias modal
					let modal = new ShellCommandAliasModal(this.app, this.plugin, shell_command_id, setting, this);
					modal.open();
				})
			)
		;
		console.log("Created.");
	}

	getShellCommandPreview(command: string) {
		let parsed_command = parseShellCommandVariables(this.app, command, false); // false: disables notifications if variables have syntax errors.
		if (null === parsed_command) {
			return "[Error while parsing variables.]";
		}
		return parsed_command;
	}

	/**
	 * @param shell_command_id String like "0" or "1" etc.
	 * @param shell_command_configuration
	 * @public Public because ShellCommandAliasModal uses this too.
	 */
	public generateCommandFieldName(shell_command_id: string, shell_command_configuration: ShellCommandConfiguration) {
		if (shell_command_configuration.alias) {
			return shell_command_configuration.alias;
		}
		return "Command #" + shell_command_id;
	}
}

class ShellCommandAliasModal extends Modal {
	private plugin: ShellCommandsPlugin;
	private readonly shell_command_id: string;
	private readonly shell_command_configuration: ShellCommandConfiguration;
	private setting_field: Setting;
	private setting_tab: ShellCommandsSettingsTab;
	private alias_field: HTMLInputElement;

	constructor(app: App, plugin: ShellCommandsPlugin, shell_command_id: string, setting_field: Setting, setting_tab: ShellCommandsSettingsTab) {
		super(app);
		this.plugin = plugin;
		this.shell_command_id = shell_command_id;
		this.shell_command_configuration = plugin.getShellCommands()[shell_command_id];
		this.setting_field = setting_field;
		this.setting_tab = setting_tab;
	}

	onOpen() {
		this.modalEl.createEl("h2", {text: "Alias for: " + this.shell_command_configuration.shell_command});
		this.alias_field = this.modalEl.createEl("input", {type: "text", value: this.shell_command_configuration.alias});
		this.modalEl.createEl("p", {text: "If not empty, the alias will be displayed in the command palette instead of the actual command. An alias is never executed as a command."});

	}

	async onClose() {
		let new_alias = this.alias_field.value;
		if (new_alias !== this.shell_command_configuration.alias) {
			// Change the alias
			console.log("Change shell command #" + this.shell_command_id + "'s alias from \"" + this.shell_command_configuration.alias + "\" to \"" + new_alias + "\".");
			this.shell_command_configuration.alias = new_alias;
			this.plugin.obsidian_commands[this.shell_command_id].name = this.plugin.generateObsidianCommandName(this.shell_command_configuration);
			this.setting_field.setName(this.setting_tab.generateCommandFieldName(this.shell_command_id, this.shell_command_configuration));
			await this.plugin.saveSettings();
			console.log(new_alias ? "Alias changed." : "Alias removed.");
			new Notice(new_alias ? "Alias changed!" : "Alias removed!");
		}
	}
}