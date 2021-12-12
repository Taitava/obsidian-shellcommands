import {SC_Event} from "./SC_Event";

export class SC_Event_onActiveLeafChanged extends SC_Event {
    protected readonly event_name = "on-active-leaf-changed";
    protected readonly event_title = "After active leaf has changed";

    protected register() {
        return this.app.workspace.on("active-leaf-change", () => this.trigger());
    }

}