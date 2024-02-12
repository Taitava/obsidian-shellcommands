/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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

import SC_Plugin from "../main";
// @ts-ignore
import {shell} from "electron";
// @ts-ignore Electron is installed.
import {clipboard} from "electron";

/**
 * Opens a web browser in the specified URL.
 * @param url
 */
export function gotoURL(url: string) {
    shell.openExternal(url); // This returns a promise, but it can be ignored as there's nothing to do after opening the browser.
}

/**
 * TODO: Move to TShellCommand.
 *
 * @param plugin
 * @param aliasOrShellCommandContent
 */
export function generateObsidianCommandName(plugin: SC_Plugin, aliasOrShellCommandContent: string) {
    const prefix = plugin.settings.obsidian_command_palette_prefix;
    return prefix + aliasOrShellCommandContent;
}

export function copyToClipboard(text: string): Promise<void> {
    return clipboard.writeText(text);
}