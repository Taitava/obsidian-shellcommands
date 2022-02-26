import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";
import {ParsingResult, TShellCommand} from "../TShellCommand";
import {Menu} from "obsidian";

export abstract class SC_MenuEvent extends SC_WorkspaceEvent {

    protected addTShellCommandToMenu(t_shell_command: TShellCommand, menu: Menu) {
        // Parse shell command variables to get a title
        let title = t_shell_command.getAlias() || t_shell_command.getShellCommand(); // May contain unparsed variables.
        let parsing_result: ParsingResult;
        if (this.plugin.settings.preview_variables_in_command_palette) {
            // Parse variables in the title.
            parsing_result = t_shell_command.parseVariables(this);
            if (parsing_result.succeeded) {
                // Override title with a value whose variables are parsed.
                title = parsing_result.alias || parsing_result.shell_command;
            }
        }

        // Add a menu item.
        menu.addItem(item => item
            .setTitle(title)
            .onClick(() => {
                this.trigger(
                    t_shell_command,
                    parsing_result, // Can be undefined, if no preparsing is done.
                );
            }),
        );
    }
}