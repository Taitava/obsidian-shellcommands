/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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

import {debugLog} from "./Debug";

export class IDGenerator {
    constructor(
        private reserved_ids: string[] = [],
        private readonly min_length = 10,
        private readonly characters = "abcdefghijklmnopqrstuvwxyz0123456789",
    ) {}

    public addReservedID(id: string) {
        debugLog(IDGenerator.name + ": Adding id " + id + " to the list of reserved ids.");
        this.reserved_ids.push(id);
    }

    public generateID(): string {
        let generated_id = "";
        while (generated_id.length < this.min_length || this.isIDReserved(generated_id)) {
            generated_id += this.generateCharacter();
        }
        this.reserved_ids.push(generated_id);
        debugLog(IDGenerator.name + ": Generated id " + generated_id);
        return generated_id;
    }

    public getReservedIDs() {
        return this.reserved_ids;
    }

    private generateCharacter(): string {
        return this.characters.charAt(
            Math.floor(Math.random() * this.characters.length)
        );
    }

    private isIDReserved(id: string): boolean {
        return this.reserved_ids.contains(id);
    }
}

const id_generator: IDGenerator = new IDGenerator();

export function getIDGenerator() {
    return id_generator;
}