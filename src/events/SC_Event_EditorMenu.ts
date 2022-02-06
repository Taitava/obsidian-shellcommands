import {TShellCommand} from "../TShellCommand";
import {Editor, MarkdownView, Menu} from "obsidian";
import {SC_MenuEvent} from "./SC_MenuEvent";

export class SC_Event_EditorMenu extends SC_MenuEvent {
    protected static readonly event_code = "editor-menu";
    protected static readonly event_title = "Editor menu";
    protected readonly workspace_event = "editor-menu";

    protected getTrigger(t_shell_command: TShellCommand) {
        return (menu: Menu, editor: Editor, view: MarkdownView) => {
            this.addTShellCommandToMenu(t_shell_command, menu);
        };
    }

}