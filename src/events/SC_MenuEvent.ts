/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";
import {ShellCommandParsingProcess, TShellCommand} from "../TShellCommand";
import {Menu} from "obsidian";

export abstract class SC_MenuEvent extends SC_WorkspaceEvent {

    protected async addTShellCommandToMenu(t_shell_command: TShellCommand, menu: Menu) {
        // Parse shell command variables to get a title
        let title = t_shell_command.getAliasOrShellCommand(); // May contain unparsed variables.
        let parsing_process: ShellCommandParsingProcess;
        if (this.plugin.settings.preview_variables_in_command_palette) {
            // Start a parsing process
            parsing_process = t_shell_command.createParsingProcess(this);
            if (await parsing_process.process()) {
                // Parsing succeeded.
                const parsing_results = parsing_process.getParsingResults();
                title = parsing_results["alias"].parsed_content || parsing_results["shell_command"].parsed_content; // Try to use a parsed alias, but if no alias is available, use a parsed shell command instead.
            }
            // If parsing process fails, the failed process can be passed to this.trigger(). The execution will eventually be cancelled and error messages displayed (if displaying is allowed).
        }

        // Add a menu item.
        menu.addItem(item => item
            .setIcon(t_shell_command.getIconId()) // Icon id can be null.
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