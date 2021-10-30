import {extractFileName, getOperatingSystem, isWindows} from "./Common";
import {PlatformShells} from "./settings/ShellCommandsPluginSettings";

export function getUsersDefaultShell(): string {
    if (isWindows()) {
        return process.env.ComSpec;
    } else {
        return process.env.SHELL;
    }
}

export function isShellSupported(shell: string) {
    const shell_file_name = extractFileName(shell);
    const supported_shells = PlatformShells[getOperatingSystem()];
    for (let supported_shell_path in supported_shells) {
        if (supported_shell_path.substr(-shell_file_name.length, shell_file_name.length).toLowerCase() === shell_file_name.toLowerCase()) {
            // If supported_shell_path (e.g. /bin/bash or CMD.EXE) ends with shell_file_name (e.g. bash, derived from /bin/bash or CMD.EXE, derived from C:\System32\CMD.EXE), then the shell can be considered to be supported.
            return true;
        }
    }
    return false;
}