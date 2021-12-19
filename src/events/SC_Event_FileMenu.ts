import {SC_AbstractFileMenuEvent} from "./SC_AbstractFileMenuEvent";
import {TShellCommand} from "../TShellCommand";
import {ShellCommandVariable} from "../variables/ShellCommandVariable";
import {Variable_EventFileName} from "../variables/event_variables/Variable_EventFileName";
import {Variable_EventFilePath} from "../variables/event_variables/Variable_EventFilePath";
import {Variable_EventFolderName} from "../variables/event_variables/Variable_EventFolderName";
import {Variable_EventFolderPath} from "../variables/event_variables/Variable_EventFolderPath";
import {Variable_EventTitle} from "../variables/event_variables/Variable_EventTitle";

export class SC_Event_FileMenu extends SC_AbstractFileMenuEvent {
    protected readonly event_code = "file-menu";
    protected readonly event_title = "File menu";
    protected file_or_folder: "file" = "file";

    protected declareExtraVariables(t_shell_command: TShellCommand): ShellCommandVariable[] {
        return [
            new Variable_EventFileName(this.plugin, t_shell_command.getShell()).setFile(this.file),
            new Variable_EventFilePath(this.plugin, t_shell_command.getShell()).setFile(this.file),
            new Variable_EventFolderName(this.plugin, t_shell_command.getShell()).setFile(this.file),
            new Variable_EventFolderPath(this.plugin, t_shell_command.getShell()).setFile(this.file),
            new Variable_EventTitle(this.plugin, t_shell_command.getShell()).setFile(this.file),
        ];
    }
}