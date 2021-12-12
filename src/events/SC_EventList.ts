import ShellCommandsPlugin from "../main";

export function getSC_Events(plugin: ShellCommandsPlugin) {
    if (undefined === getSC_Events.events) {
        // Cache the list of SC_Event objects
        getSC_Events.events = [

        ];
    }
    return getSC_Events.events;
}
getSC_Events.events = undefined;