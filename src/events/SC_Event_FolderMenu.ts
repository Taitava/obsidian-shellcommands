import {SC_AbstractFileMenuEvent} from "./SC_AbstractFileMenuEvent";
import {TShellCommand} from "../TShellCommand";
import {ShellCommandVariable} from "../variables/ShellCommandVariable";
import {Variable_EventFolderName} from "../variables/event_variables/Variable_EventFolderName";
import {Variable_EventFolderPath} from "../variables/event_variables/Variable_EventFolderPath";

export class SC_Event_FolderMenu extends SC_AbstractFileMenuEvent {
    protected readonly event_name = "folder-menu";
    protected readonly event_title = "Folder menu";
    protected file_or_folder: "folder" = "folder";

    protected declareExtraVariables(t_shell_command: TShellCommand): ShellCommandVariable[] {
        return [
            new Variable_EventFolderName(this.plugin, t_shell_command.getShell()).setFolder(this.folder),
            new Variable_EventFolderPath(this.plugin, t_shell_command.getShell()).setFolder(this.folder),
        ];
    }
}