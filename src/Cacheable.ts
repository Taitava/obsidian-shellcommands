/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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

export class Cacheable {
    
    private _caches: Map<unknown, unknown> = new Map;
    
    constructor() {
        // Listen to SC_Plugin configuration changes.
        document.addEventListener("SC-configuration-change", () => {
            // Flush cache in order to get updated usages when needed.
            this._caches = new Map;
        });
    }
    
    protected cache<CacheType>(
        cacheKey: string,
        protagonist: () => CacheType,
    ): CacheType {
        if (!this._caches.has(cacheKey)) {
            // No value is generated yet (or old value has been deleted before).
            this._caches.set(cacheKey, protagonist());
        }
        return this._caches.get(cacheKey) as CacheType;
    }
}