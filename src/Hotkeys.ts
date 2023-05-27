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

import {Hotkey, Modifier, Platform} from "obsidian";
import SC_Plugin from "./main";
import {debugLog} from "./Debug";

/**
 * TODO: Move this to TShellCommand.
 */
export function getHotkeysForShellCommand(plugin: SC_Plugin, shell_command_id: string): Hotkey[] {
    // Retrieve all hotkeys set by user.
    // @ts-ignore PRIVATE API
    const app_custom_hotkeys = plugin.app.hotkeyManager?.customKeys;
    if (!app_custom_hotkeys) {
        debugLog("getHotkeysForShellCommand() failed, will return an empty array.");
        return [];
    }

    // Get only our hotkeys.
    const hotkey_index = plugin.getPluginId() + ":" + plugin.generateObsidianCommandId(shell_command_id); // E.g. "obsidian-shellcommands:shell-command-0"
    debugLog("getHotkeysForShellCommand() succeeded.");
    return app_custom_hotkeys[hotkey_index] ?? []; // If no hotkey array is set for this command, return an empty array. Although I do believe that all commands do have an array anyway, but have this check just in case.
}

/**
 * TODO: Is there a way to make Obsidian do this conversion for us? Check this: https://github.com/pjeby/hotkey-helper/blob/c8a032e4c52bd9ce08cb909cec15d1ed9d0a3439/src/plugin.js#L4-L6
 *
 * @param hotkey
 * @constructor
 */
export function HotkeyToString(hotkey: Hotkey) {
    const keys: string[] = [];
    hotkey.modifiers.forEach((modifier: Modifier) => {
        let modifier_key = modifier.toString(); // This is one of 'Mod' | 'Ctrl' | 'Meta' | 'Shift' | 'Alt'
        if ("Mod" === modifier_key) {
            // Change "Mod" to something more meaningful.
            modifier_key = CmdOrCtrl(); // isMacOS should also be true if the device is iPhone/iPad. Can be handy if this plugin gets mobile support some day.
        }
        keys.push(modifier_key);
    });
    keys.push(hotkey.key); // This is something like a letter ('A', 'B' etc) or space/enter/whatever.
    return keys.join(" + ");
}

export function CmdOrCtrl(): "Cmd" | "Ctrl" {
    return Platform.isMacOS ? "Cmd" : "Ctrl";
}