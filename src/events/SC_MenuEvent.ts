import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";
import {ShellCommandParsingProcess, TShellCommand} from "../TShellCommand";
import {Menu} from "obsidian";

export abstract class SC_MenuEvent extends SC_WorkspaceEvent {

    protected addTShellCommandToMenu(t_shell_command: TShellCommand, menu: Menu) {
        // Parse shell command variables to get a title
        let title = t_shell_command.getAliasOrShellCommand(); // May contain unparsed variables.
        let parsing_process: ShellCommandParsingProcess;
        if (this.plugin.settings.preview_variables_in_command_palette) {
            // Start a parsing process
            parsing_process = t_shell_command.createParsingProcess(this);
            if (parsing_process.process()) {
                // Parsing succeeded.
                const parsing_results = parsing_process.getParsingResults();
                title = parsing_results["alias"].parsed_content || parsing_results["shell_command"].parsed_content; // Try to use a parsed alias, but if no alias is available, use a parsed shell command instead.
            }
        }

        // Add a menu item.
        menu.addItem(item => item
            .setTitle(title)
            .onClick(() => {
                this.trigger(
                    t_shell_command,
                    parsing_process,
                );
            }),
        );
    }
}