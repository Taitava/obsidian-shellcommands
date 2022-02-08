import {Variable} from "./Variable";
import {Variable_Clipboard} from "./Variable_Clipboard";
import {Variable_CaretPosition} from "./Variable_CaretPosition";
import {Variable_Date} from "./Variable_Date";
import {Variable_FileExtension} from "./Variable_FileExtension";
import {Variable_FileName} from "./Variable_FileName";
import {Variable_FilePath} from "./Variable_FilePath";
import {Variable_FolderName} from "./Variable_FolderName";
import {Variable_FolderPath} from "./Variable_FolderPath";
import {Variable_Selection} from "./Variable_Selection";
import {Variable_Tags} from "./Variable_Tags";
import {Variable_Title} from "./Variable_Title";
import {Variable_VaultPath} from "./Variable_VaultPath";
import {Variable_Workspace} from "./Variable_Workspace";
import {DEBUG_ON} from "../Debug";
import {Variable_Passthrough} from "./Variable_Passthrough";
import SC_Plugin from "../main";
import {Variable_YAMLValue} from "./Variable_YAMLValue";
import {SC_Event} from "../events/SC_Event";
import {Variable_EventFileName} from "./event_variables/Variable_EventFileName";
import {Variable_EventFilePath} from "./event_variables/Variable_EventFilePath";
import {Variable_EventFolderName} from "./event_variables/Variable_EventFolderName";
import {Variable_EventFolderPath} from "./event_variables/Variable_EventFolderPath";
import {Variable_EventTitle} from "./event_variables/Variable_EventTitle";
import {Variable_EventFileExtension} from "./event_variables/Variable_EventFileExtension";
import {Variable_EventTags} from "./event_variables/Variable_EventTags";
import {Variable_EventYAMLValue} from "./event_variables/Variable_EventYAMLValue";

export function getVariables(plugin: SC_Plugin, shell: string, sc_event?: SC_Event) {
    const shell_command_variables: Variable[] = [
        // Normal variables
        new Variable_CaretPosition(plugin, shell),
        new Variable_Clipboard(plugin, shell),
        new Variable_Date(plugin, shell),
        new Variable_FileExtension(plugin, shell),
        new Variable_FileName(plugin, shell),
        new Variable_FilePath(plugin, shell),
        new Variable_FolderName(plugin, shell),
        new Variable_FolderPath(plugin, shell),
        new Variable_Selection(plugin, shell),
        new Variable_Tags(plugin, shell),
        new Variable_Title(plugin, shell),
        new Variable_VaultPath(plugin, shell),
        new Variable_Workspace(plugin, shell),
        new Variable_YAMLValue(plugin, shell),

        // Event variables
        new Variable_EventFileExtension(plugin, shell, sc_event),
        new Variable_EventFileName(plugin, shell, sc_event),
        new Variable_EventFilePath(plugin, shell, sc_event),
        new Variable_EventFolderName(plugin, shell, sc_event),
        new Variable_EventFolderPath(plugin, shell, sc_event),
        new Variable_EventTags(plugin, shell, sc_event),
        new Variable_EventTitle(plugin, shell, sc_event),
        new Variable_EventYAMLValue(plugin, shell, sc_event),
    ];
    if (DEBUG_ON) {
        // Variables that are only designed for 'Shell commands test suite'.
        shell_command_variables.push(
            new Variable_Passthrough(plugin, shell),
        );
    }
    return shell_command_variables;
}

export function getVariableClasses() {
    const shell_command_variables = [
        // Normal variables
        Variable_CaretPosition,
        Variable_Clipboard,
        Variable_Date,
        Variable_FileExtension,
        Variable_FileName,
        Variable_FilePath,
        Variable_FolderName,
        Variable_FolderPath,
        Variable_Selection,
        Variable_Tags,
        Variable_Title,
        Variable_VaultPath,
        Variable_Workspace,
        Variable_YAMLValue,

        // Event variables
        Variable_EventFileExtension,
        Variable_EventFileName,
        Variable_EventFilePath,
        Variable_EventFolderName,
        Variable_EventFolderPath,
        Variable_EventTags,
        Variable_EventTitle,
        Variable_EventYAMLValue,
    ];
    if (DEBUG_ON) {
        // Variables that are only designed for 'Shell commands test suite'.
        shell_command_variables.push(
            Variable_Passthrough,
        );
    }
    return shell_command_variables;
}