/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {extractFileName, getOperatingSystem, isWindows} from "./Common";

export const PlatformShells = {
    darwin: {
        "/bin/bash": "Bash",
        "/bin/dash": "Dash",
        "/bin/zsh": "Zsh (Z shell)",
    },
    linux: {
        "/bin/bash": "Bash",
        "/bin/dash": "Dash",
        "/bin/zsh": "Zsh (Z shell)",
    },
    win32: {
        "pwsh.exe": "PowerShell Core",
        "PowerShell.exe": "PowerShell 5",
        "CMD.EXE": "cmd.exe",
    },
}

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
    for (const supported_shell_path in supported_shells) {
        if (supported_shell_path.substr(-shell_file_name.length, shell_file_name.length).toLowerCase() === shell_file_name.toLowerCase()) {
            // If supported_shell_path (e.g. /bin/bash or CMD.EXE) ends with shell_file_name (e.g. bash, derived from /bin/bash or CMD.EXE, derived from C:\System32\CMD.EXE), then the shell can be considered to be supported.
            return true;
        }
    }
    return false;
}