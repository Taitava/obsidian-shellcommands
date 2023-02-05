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

import {Escaper} from "../variables/escapers/Escaper";
import {PlatformId} from "../settings/SC_MainSettings";
import SC_Plugin from "../main";
import {
    ChildProcess,
    spawn,
    SpawnOptions,
} from "child_process";
import {debugLog} from "../Debug";

export abstract class Shell {

    constructor(
       protected plugin: SC_Plugin,
    ) {}

    /**
     * Returns an identifier with which this Shell is referenced to in configuration files.
     */
    public abstract getIdentifier(): string;

    /**
     * Returns true if the given string is the same as the shell's binary file name.
     *
     * Child classes can extend this to detect also other, non filename based identifiers.
     *
     * @param shellIdentifier
     */
    public matchesIdentifier(shellIdentifier: string): boolean {
        return this.getIdentifier().toLocaleLowerCase() === shellIdentifier.toLocaleLowerCase();
    }

    /**
     * Returns a human-readable name for the shell.
     */
    public abstract getName(): string;

    /**
     * Returns a path to the shell's executable binary file.
     */
    public abstract getBinaryPath(): string;

    /**
     * Determines which operating systems this shell can be used on.
     */
    public abstract getSupportedPlatforms(): PlatformId[];

    /**
     * Returns a character used to separate different paths in the PATH environment variable. Note that a _path separator_
     * is a different thing than a _directory separator_! The latter is used to separate folder names in a single file path.
     */
    public abstract getPathSeparator(): ":" | ";";

    /**
     * Quotes special characters in {{variable}} values according to an escaping mechanism defined for this shell.
     * Note that the value is returned intact if the shell does not support escaping. I'm looking at you, CMD.EXE! >:(
     *
     * @param rawValue
     */
    public escapeValue(rawValue: string): string {
        // Check if this Shell supports escaping
        const escaper: Escaper | null = this.getEscaper(rawValue);
        if (escaper) {
            // Escaping is supported.
            return escaper.escape();
        } else {
            // No escaping is supported.
            // Return the value without modifications.
            return rawValue;
        }
    }

    /**
     * Returns an Escaper instance used for quoting special characters in {{variable}} values. Returns null iff the shell
     * does not support escaping.
     */
    protected abstract getEscaper(rawValue: string): Escaper | null;

    /**
     * Modifies the given path so that it will work in this particular shell. The method take the following into account:
     *  - Must detect both / and \ directory separators in originalPath and replace them with the one used by the shell.
     *  - If the shell uses a different file system structure than the host operating system, must make sure the absolute
     *    path is prefixed so that the shell understands it. E.g. if using a Windows Subsystem for Linux (WSL), a Windows
     *    path like C:\MyVault\MyNote.md should be converted to /mnt/c/MyVault/MyNote.md.
     *  - Must call normalizePath2().
     *
     * @param originalPath
     */
    public abstract translateAbsolutePath(originalPath: string): string;

    /**
     * Modifies the given path so that it will work in this particular shell. The method take the following into account:
     *  - Must detect both / and \ directory separators in originalPath and replace them with the one used by the shell.
     *    path is prefixed so that the shell understands it. E.g. if using a Windows Subsystem for Linux (WSL), a Windows
     *    path like C:\MyVault\MyNote.md should be converted to /mnt/c/MyVault/MyNote.md.
     *  - Must call normalizePath2().
     *
     * @param originalPath
     */
    public abstract translateRelativePath(originalPath: string): string;

    /**
     * Executes the given shellCommandContent string using this shell. Retrieves spawning options from subclasses.
     *
     * @param shellCommandContent
     * @param extraSpawnOptions
     */
    public spawnChildProcess(shellCommandContent: string, extraSpawnOptions: CwdAndEnv): ChildProcess | null {
        // Allow subclasses to alter shellCommandContent and define other options.
        const spawnAugmentation = {
            shellCommandContent: shellCommandContent,
            spawnOptions: {},
            spawnArguments: [],
        };
        if (!this.augmentSpawn(spawnAugmentation)) {
            // Something failed in the augmentation and execution should be cancelled. An error notification is already displayed.
            return null;
        }

        // Combine SpawnOptions. Do this after calling augmentSpawn(), so that it cannot accidentally override extraSpawnOptions.
        const combinedSpawnOptions: SpawnOptions = Object.assign(
            spawnAugmentation.spawnOptions,  // Doesn't contain 'cwd' (= working directory) nor "env".
            extraSpawnOptions,              // Adds "cwd" and "env".
        );

        // Execute the shell command.
        debugLog(
            "Executing shell command: spawn(",
            spawnAugmentation.shellCommandContent, ",",
            combinedSpawnOptions, ",",
            spawnAugmentation.spawnArguments,
            ") ...",
        );
        return spawn(
            spawnAugmentation.shellCommandContent,
            spawnAugmentation.spawnArguments,
            combinedSpawnOptions,
        );
    }

    /**
     * @param spawnAugmentation
     * @return False: Indicate that execution should be cancelled. True: can execute the shell command.
     * @protected
     */
    protected abstract augmentSpawn(spawnAugmentation: SpawnAugmentation): boolean;

}

/**
 * SpawnOptions that only contain the properties "cwd" and "env".
 *
 * The name of this interface can be changed to something more general that doesn't contain the property names.
 */
export interface CwdAndEnv {
    cwd: SpawnOptions["cwd"],
    env: SpawnOptions["env"],
}

/**
 * SpawnOptions that do not contain the properties of CwdAndEnv.
 */
type ReducedSpawnOptions = Omit<SpawnOptions, keyof CwdAndEnv>;

export interface SpawnAugmentation {
    spawnOptions: ReducedSpawnOptions,
    spawnArguments: ReadonlyArray<string>,
    shellCommandContent: string,
}