import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";

export class SC_Event_onQuit extends SC_WorkspaceEvent {
    protected readonly event_name = "on-quit";
    protected readonly event_title = "Before Obsidian quits";
    protected readonly workspace_event = "quit";
}