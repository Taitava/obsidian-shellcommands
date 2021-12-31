import {ShellCommandVariable} from "./ShellCommandVariable";
import {ShellCommandVariable_Clipboard} from "./ShellCommandVariable_Clipboard";
import {ShellCommandVariable_CaretPosition} from "./ShellCommandVariable_CaretPosition";
import {ShellCommandVariable_Date} from "./ShellCommandVariable_Date";
import {ShellCommandVariable_FileExtension} from "./ShellCommandVariable_FileExtension";
import {ShellCommandVariable_FileName} from "./ShellCommandVariable_FileName";
import {ShellCommandVariable_FilePath} from "./ShellCommandVariable_FilePath";
import {ShellCommandVariable_FolderName} from "./ShellCommandVariable_FolderName";
import {ShellCommandVariable_FolderPath} from "./ShellCommandVariable_FolderPath";
import {ShellCommandVariable_Selection} from "./ShellCommandVariable_Selection";
import {ShellCommandVariable_Tags} from "./ShellCommandVariable_Tags";
import {ShellCommandVariable_Title} from "./ShellCommandVariable_Title";
import {ShellCommandVariable_VaultPath} from "./ShellCommandVariable_VaultPath";
import {ShellCommandVariable_Workspace} from "./ShellCommandVariable_Workspace";
import {DEBUG_ON} from "../Debug";
import {ShellCommandVariable_Passthrough} from "./ShellCommandVariable_Passthrough";
import ShellCommandsPlugin from "../main";
import {ShellCommandVariable_YAMLValue} from "./ShellCommandVariable_YAMLValue";
import {SC_Event} from "../events/SC_Event";
import {Variable_EventFileName} from "./event_variables/Variable_EventFileName";
import {Variable_EventFilePath} from "./event_variables/Variable_EventFilePath";
import {Variable_EventFolderName} from "./event_variables/Variable_EventFolderName";
import {Variable_EventFolderPath} from "./event_variables/Variable_EventFolderPath";
import {Variable_EventTitle} from "./event_variables/Variable_EventTitle";
import {Variable_EventFileExtension} from "./event_variables/Variable_EventFileExtension";

export function getVariables(plugin: ShellCommandsPlugin, shell: string, sc_event?: SC_Event) {
    let shell_command_variables: ShellCommandVariable[] = [
        // Normal variables
        new ShellCommandVariable_CaretPosition(plugin, shell),
        new ShellCommandVariable_Clipboard(plugin, shell),
        new ShellCommandVariable_Date(plugin, shell),
        new ShellCommandVariable_FileExtension(plugin, shell),
        new ShellCommandVariable_FileName(plugin, shell),
        new ShellCommandVariable_FilePath(plugin, shell),
        new ShellCommandVariable_FolderName(plugin, shell),
        new ShellCommandVariable_FolderPath(plugin, shell),
        new ShellCommandVariable_Selection(plugin, shell),
        new ShellCommandVariable_Tags(plugin, shell),
        new ShellCommandVariable_Title(plugin, shell),
        new ShellCommandVariable_VaultPath(plugin, shell),
        new ShellCommandVariable_Workspace(plugin, shell),
        new ShellCommandVariable_YAMLValue(plugin, shell),

        // Event variables
        new Variable_EventFileExtension(plugin, shell, sc_event),
        new Variable_EventFileName(plugin, shell, sc_event),
        new Variable_EventFilePath(plugin, shell, sc_event),
        new Variable_EventFolderName(plugin, shell, sc_event),
        new Variable_EventFolderPath(plugin, shell, sc_event),
        new Variable_EventTitle(plugin, shell, sc_event),
    ];
    if (DEBUG_ON) {
        // Variables that are only designed for 'Shell commands test suite'.
        shell_command_variables.push(
            new ShellCommandVariable_Passthrough(plugin, shell),
        );
    }
    return shell_command_variables;
}

export function getVariableClasses() {
    let shell_command_variables = [
        // Normal variables
        ShellCommandVariable_CaretPosition,
        ShellCommandVariable_Clipboard,
        ShellCommandVariable_Date,
        ShellCommandVariable_FileExtension,
        ShellCommandVariable_FileName,
        ShellCommandVariable_FilePath,
        ShellCommandVariable_FolderName,
        ShellCommandVariable_FolderPath,
        ShellCommandVariable_Selection,
        ShellCommandVariable_Tags,
        ShellCommandVariable_Title,
        ShellCommandVariable_VaultPath,
        ShellCommandVariable_Workspace,
        ShellCommandVariable_YAMLValue,

        // Event variables
        Variable_EventFileExtension,
        Variable_EventFileName,
        Variable_EventFilePath,
        Variable_EventFolderName,
        Variable_EventFolderPath,
        Variable_EventTitle,
    ];
    if (DEBUG_ON) {
        // Variables that are only designed for 'Shell commands test suite'.
        shell_command_variables.push(
            ShellCommandVariable_Passthrough,
        );
    }
    return shell_command_variables;
}