import {SC_Event} from "./SC_Event";

export class SC_Event_onQuit extends SC_Event {
    protected readonly event_name = "on-quit";
    protected readonly event_title = "Before Obsidian quits";

    protected register() {
        return this.app.workspace.on("quit", () => this.trigger());
    }

    /**
     * Need to have this wrapper method, because this.trigger() is protected.
     */
    public onUnload() {
        this.trigger();
    }
}