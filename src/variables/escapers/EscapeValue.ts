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

import {Escaper} from "./Escaper";
import {ShEscaper} from "./ShEscaper";
import {PowerShellEscaper} from "./PowerShellEscaper";
import {Notice} from "obsidian";
import {extractFileName} from "../../Common";

export function escapeValue(shell: string, raw_value: string) {
    shell = extractFileName(shell.toLowerCase());
    let escaper: Escaper;
    switch (shell) {
        case "bash":
        case "dash":
        case "zsh":
        case "sh": // May sometimes appear when using the "Use system default (sh)" option as a default shell.
            escaper = new ShEscaper(raw_value);
            break;
        case "powershell.exe":  // PowerShell 5 is only available for Windows.
        case "pwsh.exe":        // In Windows.
        case "pwsh":            // In Linux and Mac. (SC does not actually support using PowerShell on Linux/Mac just yet, but support can be added).
            escaper = new PowerShellEscaper(raw_value);
            break;
        case "cmd.exe":
            // Exception: There is no escaping support for CMD, so all values will be left unescaped when CMD is used. :(
            return raw_value;
        default:
            // Shell was not recognised.
            new Notice("EscapeValue(): Unrecognised shell: " + shell);
            throw new Error("EscapeValue(): Unrecognised shell: " + shell);
    }
    return escaper.escape();
}