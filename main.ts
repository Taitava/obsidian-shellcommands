import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {exec, ExecException} from "child_process";
import {getVaultAbsolutePath, isWindows} from "./Common";
import {
	getShellCommandVariableInstructions,
	parseShellCommandVariables
} from "./ShellCommandVariableParser";

interface ShellCommandsPluginSettings {
	working_directory: string;
	commands: string[];
}

const DEFAULT_SETTINGS: ShellCommandsPluginSettings = {
	working_directory: "",
	commands: []
}

export default class ShellCommandsPlugin extends Plugin {
	settings: ShellCommandsPluginSettings;

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		// Make all defined shell commands to appear in the Obsidian command list
		for (let command_id in this.settings.commands) {
			let command = this.settings.commands[command_id];
			this.registerShellCommand(parseInt(command_id), command);
		}

		this.addSettingTab(new ShellCommandsSettingsTab(this.app, this));
	}

	registerShellCommand(command_id: number, command: string) {
		this.addCommand({
			id: "shell-command-" + command_id,
			name: "Execute: " + command,
			callback: () => {
				this.executeShellCommand(command);
			}
		})
	}

	executeShellCommand(command: string) {
		let parsed_command = parseShellCommandVariables(this.app, command, true);
		if (null === parsed_command) {
			// The command could not be parsed correctly.
			console.log("Parsing command " + command + " failed.");
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
}

class ShellCommandsSettingsTab extends PluginSettingTab {
	plugin: ShellCommandsPlugin;

	commands: string[]; // This holds all commands temporarily: every time an command field fires its onchange event (every time user types a character), the change will be recorded here. Only when the user hits the apply changes button, will this array's content be copied over to this.plugin.settings.commands .

	constructor(app: App, plugin: ShellCommandsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.commands = this.plugin.settings.commands;
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
		if (this.commands.length > 0) {
			containerEl.createEl('p', {text: "To remove a command, clear its text field. Note that if you remove commands, other shell commands can switch place and hotkeys might change! Always check your shell commands' hotkey configurations after removing or making changes to shell commands!"});
			if (isWindows()) containerEl.createEl('p', {text: "Tip for Windows: If you get an error starting with \"[259]: Command failed:\" even though the execution works ok, you can try to prefix your command with \"start \". E.g. \"start git-gui\"."});
		}

		// A <div> element for all command input fields. New command fields can be created at the bottom of this element.
		let command_fields_container = containerEl.createEl("div");

		// Fields for modifying existing commands
		if (this.commands.length > 0) {
			for (let command_id in this.commands) {
				this.createCommandField(command_fields_container, parseInt(command_id));
			}

			// "Apply changes" button
			new Setting(containerEl)
				.setDesc("Click this when you make changes to commands. Other settings are applied automatically.")
				.addButton(button => button
					.setButtonText("APPLY CHANGES")
					.onClick(async () => {
						console.log("Updating shell command settings...")
						for (let command_id in this.commands) {
							let command = this.commands[command_id];
							if (command.length > 0) {
								// Define/change a command
								console.log("Command " + command_id + " gonna change to: " + command);
								this.plugin.settings.commands[command_id] = command;
								this.plugin.registerShellCommand(parseInt(command_id), command);
								// TODO: How to remove the old command from Obsidian commands list?
								console.log("Command changed.");
							} else {
								// Remove a command
								console.log("Command " + command_id + " gonna be removed.");
								this.plugin.settings.commands.splice(parseInt(command_id),1); // Why .remove() does not work? :( :( :(

								// TODO: How to remove a command from Obsidian commands list?
								console.log("Command removed.");
							}
						}
						await this.plugin.saveSettings();
						console.log("Shell command settings updated.");
					})
				)
			;
		}

		// "New command" button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText("New command")
				.onClick(async () => {
					this.commands.push(""); // The command is just an empty string at this point.
					this.createCommandField(command_fields_container, this.commands.length-1);
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

	createCommandField(container_element: HTMLElement, command_id: number) {
		let command = this.commands[command_id];
		let setting = new Setting(container_element)
			.setName("Command #" + command_id)
			.setDesc(this.getCommandPreview(command))
			.addText(text => text
				.setPlaceholder("Enter your command")
				.setValue(command)
				.onChange(async (value) => {
					this.commands[command_id] = value;
					setting.setDesc(this.getCommandPreview(value));
				})
			)
		;
	}

	getCommandPreview(command: string) {
		let parsed_command = parseShellCommandVariables(this.app, command, false); // false: disables notifications if variables have syntax errors.
		if (null === parsed_command) {
			return "[Error while parsing variables.]";
		}
		return parsed_command;
	}
}