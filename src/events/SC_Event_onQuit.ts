import {SC_Event} from "./SC_Event";
import {TShellCommand} from "../TShellCommand";
import {EventRef} from "obsidian";

export class SC_Event_onQuit extends SC_Event {
    protected readonly event_name = "on-quit";
    protected readonly event_title = "Before Obsidian quits";

    protected _register(t_shell_command: TShellCommand) {
        return this.app.workspace.on("quit", () => this.trigger(t_shell_command));
    }

    protected _unregister(event_reference: EventRef): void {
        this.app.workspace.offref(event_reference);
    }
}