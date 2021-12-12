import {SC_Event} from "./SC_Event";

export class SC_Event_onLayoutReady extends SC_Event {
    protected readonly event_name = "on-layout-ready";
    protected readonly event_title = "After Obsidian has loaded";

    protected register() {
        this.app.workspace.onLayoutReady(() => this.trigger());
        return false; // The constructor does not need to register anything.
    }

}