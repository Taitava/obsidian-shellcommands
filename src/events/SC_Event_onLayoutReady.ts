import {SC_Event} from "./SC_Event";
import {TShellCommand} from "../TShellCommand";

export class SC_Event_onLayoutReady extends SC_Event {
    protected readonly event_name = "on-layout-ready";
    protected readonly event_title = "After Obsidian starts";

    protected _register(t_shell_command: TShellCommand) {
        this.app.workspace.onLayoutReady(() => this.trigger(t_shell_command));
        return false; // The base class does not need to register anything.
    }

    protected _unregister(t_shell_command: TShellCommand): void {
        // No need to unregister, because this event happens only once when Obsidian starts. If the event is not enabled for a shell command, next time Obsidian starts, this event won't get registered.
    }

}