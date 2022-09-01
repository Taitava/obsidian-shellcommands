
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

/**
 * If true, logging stuff to console.log() will be enabled.
 * Might also enable some testing {{variables}} in the future, perhaps.
 */
export let DEBUG_ON = false;

export function setDEBUG_ON(value: boolean) {
    DEBUG_ON = value;
}

/**
 * Calls console.log(), but only if debugging is enabled.
 * @param message
 */
export function debugLog(message: unknown) {
    if (DEBUG_ON) {
        console.log(message);
    }
}