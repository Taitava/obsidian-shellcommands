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
import {normalizePath2} from "../common/commonObsidian";
import {Escaper} from "../variables/escapers/Escaper";
import {BuiltinShell} from "./BuiltinShell";

export class Shell_PowerShell5 extends BuiltinShell {
    protected ownedShellBinaries = [
        "PowerShell.exe",
    ];

    protected getEscaper(rawValue: string): Escaper {
        return new PowerShellEscaper(rawValue);
    }

    public getName(): string {
        return "PowerShell 5";
    }

    public getBinaryPath(): string {
        return "PowerShell.exe";
    }

    public getSupportedHostPlatforms(): PlatformId[] {
        return [
            "win32",
        ];
    }

    public getPathSeparator(): ";" {
        return ";";
    }

    public translateAbsolutePath(originalPath: string): string {
        return normalizePath2(originalPath, true);
    }

    public translateRelativePath(originalPath: string): string {
        return normalizePath2(originalPath, true);
    }
}