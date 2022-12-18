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
import {normalizePath2} from "../Common";
import {BuiltinShell} from "./BuiltinShell";

export class Shell_CMD extends BuiltinShell {
    protected ownedShellBinaries = [
        "CMD.EXE",
    ];

    protected getEscaper(rawValue: string): null {
        // :'(
        return null;
    }

    public getName(): string {
        return "cmd.exe";
    }

    public getBinaryPath(): string {
        return "CMD.EXE";
    }

    public getSupportedPlatforms(): PlatformId[] {
        return [
            "win32",
        ];
    }

    public getPathSeparator(): ";" {
        return ";";
    }

    public augmentShellCommandContentBeforeParsing(shellCommandContent: string): string {
        return shellCommandContent; // Just return the content as is for now.

        // TODO: Change "\r\n" with something that works as a linebreak for CMD.EXE.
        // return shellCommandContent.replace(/(?<!\r)\n/gu, "\r\n"); // Replace LF with CRLF, but don't accidentally replace CRLF with CRCRLF.
    }

    public translateAbsolutePath(originalPath: string): string {
        return normalizePath2(originalPath, true);
    }

    public translateRelativePath(originalPath: string): string {
        return normalizePath2(originalPath, true);
    }
}