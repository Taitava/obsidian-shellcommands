import {SC_Event} from "./SC_Event";
import {TShellCommand} from "../TShellCommand";
import {EventRef} from "obsidian";

export class SC_Event_onActiveLeafChanged extends SC_Event {
    protected readonly event_name = "on-active-leaf-changed";
    protected readonly event_title = "After active leaf has changed";

    protected _register(t_shell_command: TShellCommand) {
        return this.app.workspace.on("active-leaf-change", () => this.trigger(t_shell_command));
    }

    protected _unregister(event_reference: EventRef): void {
        this.app.workspace.offref(event_reference);
    }
}