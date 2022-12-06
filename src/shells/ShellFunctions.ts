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

import {extractFileName, getOperatingSystem, isWindows} from "../Common";

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
        if (undefined === process.env.ComSpec) {
            throw new Error("process.env.ComSpec is not a string.");
        }
        return process.env.ComSpec;
    } else {
        if (undefined === process.env.SHELL) {
            throw new Error("process.env.SHELL is not a string.");
        }
        return process.env.SHELL;
    }
}

export function isShellSupported(shell: string) {
    const shell_file_name = extractFileName(shell);
    const supported_shells = Object.getOwnPropertyNames(PlatformShells[getOperatingSystem()]);

    // Linux and macOS: Add the ambiguous 'sh' as a supported shell. It's not present in PlatformShells, because it's
    // not desired to be an explicitly selectable shell as it's uncertain, which shell it actually points to. But have
    // it supported when it comes from the "Use system default (sh)" option.
    if (!isWindows()) {
        // The platform is either Linux or macOS.
        // Add 'sh' support.
        supported_shells.push("sh");
    }

    for (const supported_shell_path of supported_shells) {
        // Check that the shell file names match. It doesn't matter in which directory the shell is located in.
        if (extractFileName(supported_shell_path).toLowerCase() === shell_file_name.toLowerCase()) {
            // The shell can be considered to be supported.
            return true;
        }
    }
    return false;
}