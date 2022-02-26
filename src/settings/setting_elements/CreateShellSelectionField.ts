import {IPlatformSpecificString, PlatformId, PlatformNames} from "../SC_MainSettings";
import {extractFileName, getOperatingSystem} from "../../Common";
import {getUsersDefaultShell, PlatformShells} from "../../Shell";
import {Setting} from "obsidian";
import SC_Plugin from "../../main";

export function createShellSelectionField(plugin: SC_Plugin, container_element: HTMLElement, shells: IPlatformSpecificString, is_global_settings: boolean) {
    let platform_id: PlatformId;
    for (platform_id in PlatformNames) {
        const platform_name = PlatformNames[platform_id];
        let options: {};
        if (is_global_settings) {
            const current_system_default = (getOperatingSystem() === platform_id) ? " (" + extractFileName(getUsersDefaultShell()) + ")" : "";
            options = {"default": "Use system default" + current_system_default};
        } else {
            options = {"default": "Use default"};
        }
        for (const shell_path in PlatformShells[platform_id]) {
            // @ts-ignore // TODO: Get rid of these two ts-ignores.
            const shell_name = PlatformShells[platform_id][shell_path];
            // @ts-ignore
            options[shell_path] = shell_name;
        }
        new Setting(container_element)
            .setName(platform_name + (is_global_settings ? " default shell" : " shell"))
            .setDesc((is_global_settings ? "Can be overridden by each shell command. " : "") + ("win32" === platform_id ? "Powershell is recommended over cmd.exe, because this plugin does not support escaping variables in CMD." : ""))
            .addDropdown(dropdown => dropdown
                .addOptions(options)
                .setValue(shells[platform_id] ?? "default")
                .onChange(((_platform_id: PlatformId) => { return async (value: string) => { // Need to use a nested function so that platform_id can be stored statically, otherwise it would always be "win32" (the last value of PlatformNames).
                    if ("default" === value) {
                        // When using default shell, the value should be unset.
                        delete shells[_platform_id];
                    } else {
                        // Normal case: assign the shell value.
                        shells[_platform_id] = value;
                    }
                    await plugin.saveSettings();
                }})(platform_id))
            )
        ;
    }
}