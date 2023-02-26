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

import {isWindows} from "../Common";
import {PlatformId} from "../settings/SC_MainSettings";
import {Shell} from "./Shell";
import {Shell_Bash} from "./Shell_Bash";
import {Shell_Dash} from "./Shell_Dash";
import {Shell_Zsh} from "./Shell_Zsh";
import {Shell_PowerShellCore} from "./Shell_PowerShellCore";
import {Shell_PowerShell5} from "./Shell_PowerShell5";
import {Shell_CMD} from "./Shell_CMD";
import SC_Plugin from "../main";

// Register shells
const shells: Set<Shell> = new Set;

export function registerBuiltinShells(plugin: SC_Plugin) {
    registerShell(new Shell_Bash(plugin));
    registerShell(new Shell_Dash(plugin));
    registerShell(new Shell_Zsh(plugin));
    registerShell(new Shell_PowerShellCore(plugin));
    registerShell(new Shell_PowerShell5(plugin));
    registerShell(new Shell_CMD(plugin));
}

/**
 * I'm not sure if the name of this method should something else than getUsersDefaultShellIdentifier(). The 'identifier'
 * is a bit confusing, because the function returns a file path.
 */
export function getUsersDefaultShellIdentifier(): string {
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


/**
 * @private Use this in getShell() only.
 */
const matchedShellsCache: Map<string, Shell> = new Map;

/**
 * Looks for a shell with the given filesystem path or id string. As the search is not as simple as just checking the equality of strings, the result is cached so that calling this multiple times should not cause overhead.
 *
 * @param shellIdentifier
 * @throws NonRecognisedShellError if a shell with the given identifier was not found.
 */
export function getShell(shellIdentifier: string): Shell {
    const cachedShell = matchedShellsCache.get(shellIdentifier);
    if (cachedShell) {
        return cachedShell;
    } else {
        for (const shell of shells) {
            if (shell.matchesIdentifier(shellIdentifier)) {
                matchedShellsCache.set(shellIdentifier, shell);
                return shell;
            }
        }
        throw new UnrecognisedShellError("No shell was found for identifier: " + shellIdentifier);
    }
}

export class UnrecognisedShellError extends Error {}

export function getShells() {
    return shells;
}

/**
 * Returns all Shells that support the given operating system.
 *
 * @param platformId
 */
export function getShellsForPlatform(platformId: PlatformId) {
    return Array.from(shells).filter((shell: Shell) => {
        return shell.getSupportedHostPlatforms().includes(platformId);
    });
}

export function registerShell(shell: Shell) {
    shells.add(shell);
}
