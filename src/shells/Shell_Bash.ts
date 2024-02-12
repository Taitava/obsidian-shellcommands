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

import {PlatformId} from "../settings/SC_MainSettings";
import {normalizePath2} from "../common/commonObsidian";
import {ShEscaper} from "../variables/escapers/ShEscaper";
import {BuiltinShell} from "./BuiltinShell";

export class Shell_Bash extends BuiltinShell {
    protected ownedShellBinaries = [
        "bash",
        "sh", // Sh might be something else than Bash, too, but make at least some Shell_* class recognise it. // TODO: Need to test that this works.
    ];

    protected getEscaper(rawValue: string): ShEscaper {
        return new ShEscaper(rawValue);
    }

    public getName(): string {
        return "Bash";
    }

    public getBinaryPath(): string {
        return "/bin/bash";
    }

    public getSupportedHostPlatforms(): PlatformId[] {
        return [
            "darwin", // macOS
            "linux",
        ];
    }

    public getPathSeparator(): ":" {
        return ":";
    }

    public translateAbsolutePath(originalPath: string): string {
        return normalizePath2(originalPath, false);
    }

    public translateRelativePath(originalPath: string): string {
        return normalizePath2(originalPath, false);
    }
}