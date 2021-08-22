import { App, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

let exec = require("child_process").exec;

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
		let working_directory = this.settings.working_directory; // TODO: Find a way to get the vault path automatically, so that the user does not need to enter the path manually in the settings.
		if (working_directory.length == 0) {
			new Notice("You must define a working directory in Shell commands settings before you can execute shell commands.")
		} else {
			exec(command, {
				"cwd": working_directory
			});
		}
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
			.setDesc("You need to insert your vault's absolute path here manually, because the plugin does not (yet) know how to retrieve the vault's directory automatically. If you want, you can enter some other directory instead, where you want your executed commands to be run in.")
			.addText(text => text
				.setPlaceholder("Insert your vault's directory or something else.")
				.setValue(this.plugin.settings.working_directory)
				.onChange(async (value) => {
					console.log("Changing working_directory to " + value);
					this.plugin.settings.working_directory = value;
					await this.plugin.saveSettings();
				})
			)

		// Fields for modifying existing commands
		if (this.commands.length > 0) {
			containerEl.createEl('p', {text: "To remove a command, clear its text field. Note that if you remove commands, other shell commands can switch place and hotkeys might change! Always check your shell commands' hotkey configurations after removing or making changes to shell commands!"});
			for (let command_id in this.commands) {
				this.createCommandField(containerEl, parseInt(command_id));
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
					this.createCommandField(containerEl, this.commands.length-1);
					console.log("New empty command created.");
				})
			)
		;
	}

	createCommandField(container_element: HTMLElement, command_id: number) {
		let command = this.commands[command_id];
		new Setting(container_element)
			.setName("Command #" + command_id)
			.addText(text => text
				.setPlaceholder("Enter your command")
				.setValue(command)
				.onChange(async (value) => {
					this.commands[command_id] = value;
				})
			)
		;

	}
}
