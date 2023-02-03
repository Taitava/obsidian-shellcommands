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
import {
    Menu,
    MenuItem,
} from "obsidian";
import {ParsingResult} from "../variables/parseVariables";
import {debugLog} from "../Debug";

export abstract class SC_MenuEvent extends SC_WorkspaceEvent {

    protected async addTShellCommandToMenu(t_shell_command: TShellCommand, menu: Menu) {
        const debugLogBaseMessage: string = this.constructor.name + ".addTShellCommandToMenu(): ";

        // Create the menu item as soon as possible. (If it's created after 'await parsing_process.process()' below, it won't be shown in the menu for some reason, at least in Obsidian 0.16.1).
        debugLog(debugLogBaseMessage + "Creating a menu item. Container menu: " + menu.constructor.name);
        menu.addItem((menuItem: MenuItem): void => {
            let parsing_process: ShellCommandParsingProcess;

            // Menu item creation has to happen synchronously - at least on macOS, so:
            // 1. Set first all menu item properties that can be set already:
            //    - A preliminary title: Use shell command alias WITHOUT parsing any possible variables.
            //    - Icon (if defined for the shell command)
            //    - A click handler
            // 2. Then call an asynchronous function that will parse possible variables in the menu title and UPDATE the title. The updating only works on some systems. Systems that will not support the delayed update, will show the first, unparsed title. It's better than nothing.

            // 1. Set properties early.
            let title = t_shell_command.getAliasOrShellCommand(); // May contain unparsed variables.
            debugLog(debugLogBaseMessage + "Setting a preliminary menu title (possible variables are not parsed yet): ", title);
            menuItem.setTitle(title);
            menuItem.setIcon(t_shell_command.getIconId()); // Icon id can be null.
            menuItem.onClick(async () => {
                debugLog(debugLogBaseMessage + "Menu item '" + title + "' is clicked. Will execute shell command id " + t_shell_command.getId() + ".");
                await this.trigger(
                    t_shell_command,
                    parsing_process,
                );
            });

            // 2. Parse variables asynchronously.
            if (this.plugin.settings.preview_variables_in_command_palette) {
                // Start a parsing process ASYNCHRONOUSLY.
                debugLog(debugLogBaseMessage + "Will parse menu title: " + title);
                (async (): Promise<void> => {
                    parsing_process = t_shell_command.createParsingProcess(this);
                    if (await parsing_process.process()) {
                        // Parsing succeeded.
                        const parsing_results = parsing_process.getParsingResults();
                        const aliasParsingResult: ParsingResult = parsing_results["alias"] as ParsingResult; // as ParsingResult: Tells TypeScript that the object exists.
                        const shellCommandParsingResult: ParsingResult = parsing_results["shell_command"] as ParsingResult; // as ParsingResult: Tells TypeScript that the object exists.
                        title = aliasParsingResult.parsed_content || shellCommandParsingResult.parsed_content as string; // Try to use a parsed alias, but if no alias is available, use a parsed shell command instead. as string = parsed shell command always exist when the parsing itself has succeeded.
                        debugLog(debugLogBaseMessage + "Menu title parsing succeeded. Will use title: " + title);
                        menuItem.setTitle(title);
                    } else {
                        // If parsing process fails, the failed process can be passed to this.trigger(). The execution will eventually be cancelled and error messages displayed (assuming user clicks the menu item to execute the shell command, AND if displaying errors is allowed in the shell command's settings).
                        // Keep the title set in phase 1 as-is. I.e. the title shows unparsed variables.
                        debugLog(debugLogBaseMessage + "Menu title parsing failed. Error message(s): ", ...parsing_process.getErrorMessages());
                    }
                })().then(); // Note: no waiting. If you add code below, it will evaluate before the above variable parsing finishes.
                // For the future: If Obsidian will make Menu.addItem() support async callback functions, remove the above '.then()' and use an 'await' instead to make this function properly signal Obsidian when the menu title generation process has finished. Follow this discussion: https://forum.obsidian.md/t/menu-additem-support-asynchronous-callback-functions/52870
            } else {
                debugLog(debugLogBaseMessage + "Alias parsing is disabled in settings.");
            }
        });
    }
}