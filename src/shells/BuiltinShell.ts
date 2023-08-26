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
import {
    extractFileName,
} from "../Common";
import {
    convertNewlinesToPATHSeparators,
    getPATHEnvironmentVariableName,
} from "../settings/setting_elements/PathEnvironmentVariableFunctions";
import {debugLog} from "../Debug";

export abstract class BuiltinShell extends Shell {

    /**
     * File names (without directories!) which the shell might appear using.
     *
     * @protected
     */
    protected abstract ownedShellBinaries: string[];
    
    /**
     * This is undefined if setEnvironmentVariablePathAugmentation() is never called. It's never called, if the current
     * operating system's PATH augmentation string is empty.
     * TODO: Get rid of this property and find a way to pass the augmentation via parameters. This property has a risk that its content may be stale.
     * @private
     */
    private pathAugmentation: string | undefined;

    /**
     * Built-in shells use the path to the shell executable as their identifier in configuration files.
     */
    public getIdentifier(): string {
        return this.getBinaryPath();
    }

    public matchesIdentifier(shellIdentifier: string): boolean {
        // First check if the base version of this method matches the identifier.
        if (super.matchesIdentifier(shellIdentifier)) {
            return true;
        }

        // Do an additional check on ownedShellBinaries.
        const shellFileName = extractFileName(shellIdentifier);
        return this.ownedShellBinaries.some((ownedShellBinary: string) => {
            return ownedShellBinary.toLocaleLowerCase() === shellFileName.toLocaleLowerCase();
        });
    }

    /**
     * Tells what shell binary to use during spawning.
     *
     * BuiltinShells do not need to alter the executable shell command, nor define any spawn arguments.
     *
     * @param spawnAugmentation
     * @protected
     */
    protected async augmentSpawn(spawnAugmentation: SpawnAugmentation): Promise<boolean> {
        spawnAugmentation.spawnOptions.shell = this.getBinaryPath();
        return true;
    }

    public setEnvironmentVariablePathAugmentation(pathAugmentation: string | undefined): void {
        this.pathAugmentation = pathAugmentation;
    }

    protected augmentPATHEnvironmentVariable(): string {
        const pathAugmentation = convertNewlinesToPATHSeparators(this.pathAugmentation ?? "", this.getPathSeparator());
        // Check if there's anything to augment.
        if (pathAugmentation.length > 0) {
            // Augment.
            const originalPath: string | undefined = process.env[getPATHEnvironmentVariableName()];
            if (undefined === originalPath) {
                throw new Error("process.env does not contain '" + getPATHEnvironmentVariableName() + "'.");
            }
            let augmentedPath: string;
            if (pathAugmentation.contains(originalPath)) {
                // The augmentation contains the original PATH.
                // Simply replace the whole original PATH with the augmented one, as there's no need to care about including
                // the original content.
                debugLog("Augmenting environment variable PATH so it will become " + pathAugmentation);
                augmentedPath = pathAugmentation;
            } else {
                // The augmentation does not contain the original PATH.
                // Instead of simply replacing the original PATH, append the augmentation after it.
                const separator = this.getPathSeparator();
                debugLog("Augmenting environment variable PATH by adding " + separator + pathAugmentation + " after it.");
                augmentedPath = originalPath + separator + pathAugmentation;
            }
            debugLog("PATH augmentation result: " + augmentedPath);
            return augmentedPath;
        } else {
            // No augmenting is needed.
            debugLog("No augmentation is defined for environment variable PATH. This is completely ok.");
            return "";
        }
    }

}