import ShellCommandsPlugin from "../main";
import {SC_Event_onLayoutReady} from "./SC_Event_onLayoutReady";
import {SC_Event_onQuit} from "./SC_Event_onQuit";
import {SC_Event_onActiveLeafChanged} from "./SC_Event_onActiveLeafChanged";
import {SC_Event_EveryNSeconds} from "./SC_Event_EveryNSeconds";

export function getSC_Events(plugin: ShellCommandsPlugin) {
    if (undefined === getSC_Events.events) {
        // Cache the list of SC_Event objects
        getSC_Events.events = [
            new SC_Event_onLayoutReady(plugin),
            new SC_Event_onQuit(plugin),
            new SC_Event_onActiveLeafChanged(plugin),
            new SC_Event_EveryNSeconds(plugin),
        ];
    }
    return getSC_Events.events;
}
getSC_Events.events = undefined;