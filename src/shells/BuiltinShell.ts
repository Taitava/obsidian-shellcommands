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
import {extractFileName} from "../Common";

export abstract class BuiltinShell extends Shell {

    /**
     * File names (without directories!) which the shell might appear using.
     *
     * @protected
     */
    protected abstract ownedShellBinaries: string[];

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
    protected augmentSpawn(spawnAugmentation: SpawnAugmentation): boolean {
        spawnAugmentation.spawnOptions.shell = this.getBinaryPath();
        return true;
    }

}