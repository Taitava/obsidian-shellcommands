/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
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

import {PowerShellEscaper} from "../variables/escapers/PowerShellEscaper";
import {PlatformId} from "../settings/SC_MainSettings";
import {
    isWindows,
    normalizePath2,
} from "../Common";
import {Escaper} from "../variables/escapers/Escaper";
import {BuiltinShell} from "./BuiltinShell";

export class Shell_PowerShellCore extends BuiltinShell {
    protected ownedShellBinaries = [
        "pwsh.exe", // On Windows.
        "pwsh",     // On Linux and Mac. (SC does not actually support using PowerShell on Linux/Mac just yet, but support can be added).
    ];

    protected getEscaper(rawValue: string): Escaper {
        return new PowerShellEscaper(rawValue);
    }

    public getName(): string {
        return "PowerShell Core";
    }

    public getBinaryPath(): string {
        return "pwsh.exe";
    }

    /**
     * PowerShell Core could be used on all platforms, but SC currently supports it only on Windows.
     */
    public getSupportedPlatforms(): PlatformId[] {
        return [
            "win32",
            // "darwin", // Support for these can be added later.
            // "linux",
        ];
    }

    public getPathSeparator(): ";" {
        return ";";
    }

    public translateAbsolutePath(originalPath: string): string {
        return normalizePath2(originalPath, isWindows()); // Use \ when on Windows, / on macOS and Linux.
    }

    public translateRelativePath(originalPath: string): string {
        return normalizePath2(originalPath, isWindows()); // Use \ when on Windows, / on macOS and Linux.
    }
}