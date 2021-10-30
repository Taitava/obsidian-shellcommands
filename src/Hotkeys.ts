import {Hotkey, Modifier, Platform} from "obsidian";
import ShellCommandsPlugin from "./main";
import {debugLog} from "./Debug";

export function getHotkeysForShellCommand(plugin: ShellCommandsPlugin, shell_command_id: string): Hotkey[] {
    // Retrieve all hotkeys set by user.
    // @ts-ignore
    let app_custom_hotkeys = plugin.app.hotkeyManager?.customKeys;
    if (!app_custom_hotkeys) {
        debugLog("getHotkeysForShellCommand() failed, will return an empty array.")
        return [];
    }

    // Get only our hotkeys.
    let hotkey_index =plugin.getPluginId() + ":" + plugin.generateObsidianCommandId(shell_command_id); // E.g. "obsidian-shellcommands:shell-command-0"
    debugLog("getHotkeysForShellCommand() succeeded.")
    return app_custom_hotkeys[hotkey_index] ?? []; // If no hotkey array is set for this command, return an empty array. Although I do believe that all commands do have an array anyway, but have this check just in case.
}

/**
 * TODO: Is there a way to make Obsidian do this conversion for us?
 *
 * @param hotkey
 * @constructor
 */
export function HotkeyToString(hotkey: Hotkey) {
    let keys: string[] = [];
    hotkey.modifiers.forEach((modifier: Modifier) => {
        let modifier_key = modifier.toString(); // This is one of 'Mod' | 'Ctrl' | 'Meta' | 'Shift' | 'Alt'
        if ("Mod" === modifier_key) {
            // Change "Mod" to something more meaningful.
            modifier_key = Platform.isMacOS ? "Cmd" : "Ctrl"; // isMacOS should also be true if the device is iPhone/iPad. Can be handy if this plugin gets mobile support some day.
        }
        keys.push(modifier_key);
    });
    keys.push(hotkey.key); // This is something like a letter ('A', 'B' etc) or space/enter/whatever.
    return keys.join(" + ");
}