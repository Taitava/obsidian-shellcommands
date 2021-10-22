import {TShellCommand} from "./TShellCommand";
import ShellCommandsPlugin from "./main";
import {ShellCommandConfiguration} from "./settings/ShellCommandConfiguration";
import {cloneObject} from "./Common";

export class TShellCommandTemporary extends TShellCommand {

    /**
     * @private Do not create new objects directly, use fromTShellCommand() instead.
     * @param plugin
     * @param shell_command_configuration
     */
    constructor(plugin: ShellCommandsPlugin, shell_command_configuration: ShellCommandConfiguration) {
        super(plugin, null, shell_command_configuration);
    }

    public getId(): string {
        throw Error("TShellCommandTemporary does not have an ID, because it is a clone of a real TShellCommand that should not be saved.");
    }

    /**
     * Returns a TShellCommandTemporary instance, which contains configuration that is copied from the given TShellCommand.
     * The clone can be used for altering the configuration temporarily. The clone cannot be saved, and it's ID cannot be
     * accessed.
     */
    public static fromTShellCommand(t_shell_command: TShellCommand) {
        return new TShellCommandTemporary(
            t_shell_command.getPlugin(),
            cloneObject(t_shell_command.getConfiguration()),
        );
    }
}