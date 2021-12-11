import {ShellCommandVariable} from "./ShellCommandVariable";
import {ShellCommandVariable_Clipboard} from "./ShellCommandVariable_Clipboard";
import {ShellCommandVariable_Date} from "./ShellCommandVariable_Date";
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
import {ShellCommandVariable_Newline} from "./ShellCommandVariable_Newline";

export function getVariables(plugin: ShellCommandsPlugin, shell: string) {
    let shell_command_variables: ShellCommandVariable[] = [
        new ShellCommandVariable_Clipboard(plugin, shell),
        new ShellCommandVariable_Date(plugin, shell),
        new ShellCommandVariable_FileName(plugin, shell),
        new ShellCommandVariable_FilePath(plugin, shell),
        new ShellCommandVariable_FolderName(plugin, shell),
        new ShellCommandVariable_FolderPath(plugin, shell),
        new ShellCommandVariable_Newline(plugin, shell),
        new ShellCommandVariable_Selection(plugin, shell),
        new ShellCommandVariable_Tags(plugin, shell),
        new ShellCommandVariable_Title(plugin, shell),
        new ShellCommandVariable_VaultPath(plugin, shell),
        new ShellCommandVariable_Workspace(plugin, shell),
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
        ShellCommandVariable_Clipboard,
        ShellCommandVariable_Date,
        ShellCommandVariable_FileName,
        ShellCommandVariable_FilePath,
        ShellCommandVariable_FolderName,
        ShellCommandVariable_FolderPath,
        ShellCommandVariable_Newline,
        ShellCommandVariable_Selection,
        ShellCommandVariable_Tags,
        ShellCommandVariable_Title,
        ShellCommandVariable_VaultPath,
        ShellCommandVariable_Workspace,
    ];
    if (DEBUG_ON) {
        // Variables that are only designed for 'Shell commands test suite'.
        shell_command_variables.push(
            ShellCommandVariable_Passthrough,
        );
    }
    return shell_command_variables;
}