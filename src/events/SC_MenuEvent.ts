import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";
import {TShellCommand} from "../TShellCommand";
import {Menu} from "obsidian";

export abstract class SC_MenuEvent extends SC_WorkspaceEvent {

    protected addTShellCommandToMenu(original_t_shell_command: TShellCommand, menu: Menu) {
        // Parse shell command variables and get a title
        let use_t_shell_command = original_t_shell_command
        const preparsed_t_shell_command = original_t_shell_command.preparseVariables(this.declareExtraVariables(use_t_shell_command));
        if (preparsed_t_shell_command) {
            use_t_shell_command = preparsed_t_shell_command;
        }

        // Add a menu item.
        menu.addItem(item => item
            .setTitle(use_t_shell_command.getAlias() || use_t_shell_command.getShellCommand())
            .onClick(() => {
                this.trigger(original_t_shell_command);
            }),
        );
    }
}