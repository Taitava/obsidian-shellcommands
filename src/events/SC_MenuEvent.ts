/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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
import {ParsingResult} from "../variables/parseVariables";
import {debugLog} from "../Debug";

export abstract class SC_MenuEvent extends SC_WorkspaceEvent {

    protected async addTShellCommandToMenu(t_shell_command: TShellCommand, menu: Menu) {
        const debugLogBaseMessage: string = this.constructor.name + ".addTShellCommandToMenu(): ";

        // Create the menu item as soon as possible. (If it's created after 'await parsing_process.process()' below, it won't be shown in the menu for some reason, at least in Obsidian 0.16.1).
        debugLog(debugLogBaseMessage + "Creating a menu item. Container menu: " + menu.constructor.name);
        menu.addItem(async menuItem => {
            // Parse shell command variables to get a title
            let title = t_shell_command.getAliasOrShellCommand(); // May contain unparsed variables.
            debugLog(debugLogBaseMessage + "Menu title before possible parsing: " + title);
            let parsing_process: ShellCommandParsingProcess;
            if (this.plugin.settings.preview_variables_in_command_palette) {
                // Start a parsing process
                debugLog(debugLogBaseMessage + "Will parse menu title: " + title);
                parsing_process = t_shell_command.createParsingProcess(this);
                if (await parsing_process.process()) {
                    // Parsing succeeded.
                    const parsing_results = parsing_process.getParsingResults();
                    const aliasParsingResult: ParsingResult = parsing_results["alias"] as ParsingResult; // as ParsingResult: Tells TypeScript that the object exists.
                    const shellCommandParsingResult: ParsingResult = parsing_results["shell_command"] as ParsingResult; // as ParsingResult: Tells TypeScript that the object exists.
                    title = aliasParsingResult.parsed_content || shellCommandParsingResult.parsed_content as string; // Try to use a parsed alias, but if no alias is available, use a parsed shell command instead. as string = parsed shell command always exist when the parsing itself has succeeded.
                    debugLog(debugLogBaseMessage + "Menu title parsing succeeded. Parsed title: " + title);
                } else {
                    // If parsing process fails, the failed process can be passed to this.trigger(). The execution will eventually be cancelled and error messages displayed (assuming user clicks the menu item to execute the shell command, AND if displaying errors is allowed in the shell command's settings).
                    debugLog(debugLogBaseMessage + "Menu title parsing failed. Error message(s): ", ...parsing_process.getErrorMessages());
                }
            } else {
                debugLog(debugLogBaseMessage + "Alias parsing is disabled in settings.");
            }

            // Set menu item title - be it parsed or not.
            debugLog(debugLogBaseMessage + "Will use the following menu title: " + title);
            menuItem.setTitle(title);

            // Icon and onClick handler.
            debugLog(debugLogBaseMessage + "Will set a possible icon and click handler.");
            menuItem
                .setIcon(t_shell_command.getIconId()) // Icon id can be null.
                .onClick(async () => {
                    debugLog(debugLogBaseMessage + "Menu item '" + title + "' is clicked. Will execute shell command id " + t_shell_command.getId() + ".");
                    await this.trigger(
                        t_shell_command,
                        parsing_process,
                    );
                })
            ;
        });
    }
}