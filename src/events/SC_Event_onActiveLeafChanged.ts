import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";

export class SC_Event_onActiveLeafChanged extends SC_WorkspaceEvent {
    protected readonly event_code = "on-active-leaf-changed";
    protected readonly event_title = "After switching the active pane";
    protected readonly workspace_event = "active-leaf-change";
}