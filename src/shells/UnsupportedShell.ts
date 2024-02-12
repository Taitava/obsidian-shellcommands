/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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
import {
    getCurrentPlatformName,
    isWindows,
} from "../common/commonPlatform";
import {normalizePath2} from "../common/commonObsidian";
import {
    PlatformId,
} from "../settings/SC_MainSettings";
import {Escaper} from "../variables/escapers/Escaper";
import {SC_Event} from "../events/SC_Event";
import {TShellCommand} from "../models/shell_command/TShellCommand";
import {
    Shell,
    SpawnAugmentation,
} from "./Shell";
import SC_Plugin from "../main";

/**
 * getShell() returns this "Shell" if it's passed an identifier string that matches no defined Shells. The unrecognized
 * shell identifier string comes from getUsersDefaultShellIdentifier(), which receives it from the current operating
 * system, so it's possible that the shell identifier is something that is not supported.
 *
 * This Shell tries to play along as long as nothing is executed (e.g. can be passed to parseVariables() to provide an
 * escaper - which is actually null, so it disables escaping). When a shell command is tried to be executed, this Shell
 * will show an error message telling that the shell identifier is not supported by the plugin, but the user might be able
 * to define the same shell as a CustomShell.
 *
 * UnsupportedShell must never be registered by calling registerShell(). It's only created in getShell() if needed.
 */
export class UnsupportedShell extends Shell {

    public constructor(
        plugin: SC_Plugin,
        private unrecognisedShellIdentifier: string,
    ) {
        super(plugin);
    }

    public matchesIdentifier(shellIdentifier: string): false {
        return false; // UnsupportedShell is not picked up via normal matching, it's picked up by getShell() when no other shell matches.
    }


    public getIdentifier(): string {
        return ""; // UnsupportedShell has no identifier of its own, as it can't be voluntarily selected as a Shell.
    }

    public getBinaryPath(): string {
        return ""; // UnsupportedShell could return this.unrecognisedShellIdentifier as its binary path, but doesn't want to.
    }

    protected getEscaper(rawValue: string): Escaper | null {
        return null; // UnsupportedShell does not know what escaping mechanism it would prefer, so it chooses no escaping.
    }

    public getName(): string {
        return "Unsupported shell: " + this.unrecognisedShellIdentifier;
    }

    public getPathSeparator(): ":" | ";" {
        return isWindows() ? ";" : ":"; // UnsupportedShell can behave nicely when doing PATH environment variable augmentations.
    }

    public getSupportedHostPlatforms(): PlatformId[] {
        return []; // UnsupportedShell is unsupported on all platforms.
    }

    public translateAbsolutePath(originalPath: string): string {
        return normalizePath2(originalPath, isWindows()); // UnsupportedShell does platform specific path normalizations for {{variable}} parsing in order not to break shell command preview texts.
    }

    public translateRelativePath(originalPath: string): string {
        return normalizePath2(originalPath, isWindows()); // UnsupportedShell does platform specific path normalizations for {{variable}} parsing in order not to break shell command preview texts.
    }

    protected async augmentSpawn(spawnAugmentation: SpawnAugmentation, tShellCommand: TShellCommand | null, scEvent: SC_Event | null): Promise<boolean> {
        this.plugin.newError("This plugin does not support the following shell directly: " + this.unrecognisedShellIdentifier + ". Please consider setting it up as a custom shell in the plugin's settings. Then select the custom shell as a default for " + getCurrentPlatformName() + " in the plugin's settings.");
        return false;
    }

}