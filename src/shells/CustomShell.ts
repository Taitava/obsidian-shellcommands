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

import {Shell} from "./Shell";
import {CustomShellInstance} from "../models/custom_shell/CustomShellInstance";
import {Escaper} from "../variables/escapers/Escaper";
import {PlatformId} from "../settings/SC_MainSettings";
import {PowerShellEscaper} from "../variables/escapers/PowerShellEscaper";
import {ShEscaper} from "../variables/escapers/ShEscaper";
import {
    isWindows,
    normalizePath2,
} from "../Common";

export class CustomShell extends Shell {

    constructor(
        private customShellInstance: CustomShellInstance,
    ) {
        super();
    }

    public getBinaryPath(): string {
        return this.customShellInstance.configuration.binary_path;
    }

    protected getEscaper(rawValue: string): Escaper | null {
        const escaper = this.customShellInstance.configuration.escaper;
        switch (escaper) {
            case "PowerShell":
                return new PowerShellEscaper(rawValue);
            case "UnixShell":
                return new ShEscaper(rawValue);
            case "none":
                return null;
            default:
                throw new Error("Unrecognised escaper: " + escaper);
        }
    }

    public getIdentifier(): string {
        return this.customShellInstance.getId();
    }

    public getName(): string {
        return this.customShellInstance.configuration.name;
    }

    public getSupportedPlatforms(): PlatformId[] {
        return this.customShellInstance.configuration.supported_platforms;
    }

    public getPathSeparator(): ":" | ";" {
        const pathSeparator = this.customShellInstance.configuration.path_separator;
        if ("platform" === pathSeparator) {
            // Decide by the current platform.
            return isWindows() ? ";" : ":";
        }
        return pathSeparator;
    }

    private getDirectorySeparator(): "\\" | "/" {
        const directorySeparator = this.customShellInstance.configuration.directory_separator;
        if ("platform" === directorySeparator) {
            // Decide by the current platform.
            return isWindows() ? "\\" : "/";
        }
        return directorySeparator;
    }

    public translateAbsolutePath(originalPath: string): string {
        // 1. Normalize the path before passing it to translator.
        const normalizedPath = normalizePath2(originalPath, this.getDirectorySeparator() === "\\"); // TODO: Think about changing normalizePath2() so that it would take the directory separator as a parameter, rather than a boolean. There's also a possible issue as normalizePath2() does not convert \ to / if needed, it can only convert the other way around, / to \ .

        // 2. Pass to a custom translator (if defined).
        return this.callPathTranslator(normalizedPath, "absolute");
    }

    public translateRelativePath(originalPath: string): string {
        // 1. Normalize the path before passing it to translator.
        const normalizedPath = normalizePath2(originalPath, this.getDirectorySeparator() === "\\"); // TODO: Same as above.

        // 2. Pass to a custom translator (if defined).
        return this.callPathTranslator(normalizedPath, "relative");
    }

    private callPathTranslator(path: string, absoluteOrRelative: "absolute" | "relative"): string {
        const pathTranslatorCode: string | null = this.customShellInstance.configuration.path_translator;
        if (null === pathTranslatorCode) {
            // No translator is defined.
            // Return the path without modifications.
            return path;
        }
        const pathTranslator = window.eval("function (path, type) {" + pathTranslatorCode + "}");
        return pathTranslator(path, absoluteOrRelative);
    }

}