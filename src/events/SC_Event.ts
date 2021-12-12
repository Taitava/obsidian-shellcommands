import ShellCommandsPlugin from "../main";
import {App, EventRef} from "obsidian";
import {TShellCommand} from "../TShellCommand";
import {getSC_Events} from "./SC_EventList";
import {parseShellCommandVariables} from "../variables/parseShellCommandVariables";

/**
 * Named SC_Event instead of just Event, because Event is a class in JavaScript.
 */
export abstract class SC_Event {
    protected readonly plugin: ShellCommandsPlugin;
    protected readonly app: App;
    protected readonly event_name: string;
    protected readonly event_title: string;

    public constructor(plugin: ShellCommandsPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    protected register(): false | EventRef {
        // If a child class does not define register(), then it's assumed that the event does not need registering.
        return false;
    }

    /**
     * Executes all shell commands that are assigned to this event.
     */
    protected trigger() {
        // Iterate all shell commands that are assigned to this event.
        this.getAssignedTShellCommands().forEach((t_shell_command: TShellCommand) => {
            // Parse variables and execute the shell command.
            const parsed_shell_command = parseShellCommandVariables(this.plugin, t_shell_command.getShellCommand(), t_shell_command.getShell());

            // Check the parsing result.
            if (Array.isArray(parsed_shell_command)) {
                // Errors occurred when parsing variables.
                this.plugin.newErrors(parsed_shell_command);
            } else {
                // Variables were parsed ok.
                // Execute the shell command.
                this.plugin.confirmAndExecuteShellCommand(parsed_shell_command, t_shell_command);
            }
        });
    }

    /**
     * Returns an array of TShellCommands that are enabled for this particular event.
     * @private
     */
    private getAssignedTShellCommands() {
        const assigned_t_shell_commands: TShellCommand[] = [];
        const shell_command_ids = Object.getOwnPropertyNames(this.plugin.getTShellCommands());
        shell_command_ids.forEach((t_shell_command_id: string) => {
            const t_shell_command = this.plugin.getTShellCommands()[t_shell_command_id];
            if (t_shell_command.isAssignedToSC_Event(this.event_name)) {
                assigned_t_shell_commands.push(t_shell_command);
            }
        });
        return assigned_t_shell_commands;
    }

    public getName() {
        return this.event_name;
    }

    public getTitle() {
        return this.event_title;
    }

    public static registerSC_Events(plugin: ShellCommandsPlugin) {
        getSC_Events(plugin).forEach((sc_event: SC_Event) => {
            const event_reference = sc_event.register();
            if (event_reference) {
                plugin.registerEvent(event_reference);
            }
        });
    }
}