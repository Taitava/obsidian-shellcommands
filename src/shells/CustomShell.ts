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

import {
    Shell,
    SpawnAugmentation,
} from "./Shell";
import {CustomShellInstance} from "../models/custom_shell/CustomShellInstance";
import {Escaper} from "../variables/escapers/Escaper";
import {PlatformId} from "../settings/SC_MainSettings";
import {PowerShellEscaper} from "../variables/escapers/PowerShellEscaper";
import {ShEscaper} from "../variables/escapers/ShEscaper";
import {
    getOperatingSystem,
    normalizePath2,
} from "../Common";
import SC_Plugin from "../main";
import * as fs from "fs";
import {CustomShellConfiguration} from "../models/custom_shell/CustomShellModel";

export class CustomShell extends Shell {

    constructor(
        plugin: SC_Plugin,
        private customShellInstance: CustomShellInstance,
    ) {
        super(plugin);
    }

    public getBinaryPath(): string {
        return this.getConfiguration().binary_path;
    }

    protected getEscaper(rawValue: string): Escaper | null {
        const escaper = this.getConfiguration().escaper;
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
        return this.getConfiguration().name;
    }

    public getSupportedHostPlatforms(): PlatformId[] {
        const hostPlatforms = this.getConfiguration().host_platforms;
        const supportedHostPlatforms: PlatformId[] = [];
        let platformId: PlatformId;
        for (platformId of Object.getOwnPropertyNames(hostPlatforms) as (keyof typeof hostPlatforms)[]) {
            if (hostPlatforms[platformId].enabled) {
                supportedHostPlatforms.push(platformId);
            }
        }
        return supportedHostPlatforms;
    }

    /**
     * @see CustomShellConfiguration.shell_platform
     * @private Can be made public if needed.
     */
    private getShellPlatformId(): PlatformId {
        return this.getConfiguration().shell_platform ?? getOperatingSystem();
    }

    /**
     * @private Can be made public if needed.
     */
    private shellPlatformIsWindows() {
        return this.getShellPlatformId() === "win32";
    }

    public getPathSeparator(): ":" | ";" {
        return this.shellPlatformIsWindows() ? ";" : ":";
    }

    private getDirectorySeparator(): "\\" | "/" {
        return this.shellPlatformIsWindows() ? "\\" : "/";
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
        const pathTranslatorCode: string | null = this.getConfiguration().path_translator;
        if (null === pathTranslatorCode) {
            // No translator is defined.
            // Return the path without modifications.
            return path;
        }

        try {
            // Create a JS function for doing the translation.
            const translatorFunction = new Function(
                "path", "type", // Parameter names
                pathTranslatorCode // Function content
            );
            return translatorFunction(path, absoluteOrRelative);
        } catch (error) {
            // Something failed.
            // Display an error balloon.
            this.plugin.newError(this.getName() + ": Translating path (" + path + ", " + absoluteOrRelative + ") failed: " + error.message);
            throw error; // Rethrow.
        }
    }

    protected augmentSpawn(spawnAugmentation: SpawnAugmentation): boolean {
        const shellBinaryPath = this.getBinaryPath();
        if (!fs.existsSync(shellBinaryPath)) {
            // Shell binary does not exist.
            this.plugin.newError("Custom shell " + this.getName() + ": Binary path does not exist: " + shellBinaryPath);
            return false; // Prevent execution.
        }

        // Disable Node.js's builtin shell feature.
        // CustomShells need to be able to define their own shell invoking command line options, so the Node.js's shell feature would be too limited.
        spawnAugmentation.spawnOptions.shell = false; // It's probably false by default in Node.js's spawn(), but make it explicit.

        // Use shell command content as a spawn argument instead of letting spawn() execute it directly.
        spawnAugmentation.spawnArguments = [
            spawnAugmentation.shellCommandContent, // FIXME: Doesn't work usually. Only works if the command contains no parameters. E.g. `pwd` works, but `echo Hello` does not work. At least in WSL.
            // TODO: Add an ability to define additional arguments in CustomShellConfiguration - both before and after the shell command content.
        ];

        // Tell spawn() to use the shell binary path as an executable command.
        spawnAugmentation.shellCommandContent = shellBinaryPath; // Needs to come AFTER the original shellCommandContent is taken to spawnArguments!
        return true; // Allow execution.
    }

    private getConfiguration(): CustomShellConfiguration {
        return this.customShellInstance.configuration;
    }
}