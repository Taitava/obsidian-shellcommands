/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
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

import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import SC_Plugin from "../main";

export function getVariableAutocompleteItems(plugin: SC_Plugin) {
    if (0 === autocomplete_items.length) {
        plugin.getVariables().forEach((variable) => {
            autocomplete_items.push(...variable.getAutocompleteItems());
        });
    }
    return autocomplete_items;
}

export function resetVariableAutocompleteItems() {
    while (autocomplete_items.length) {
        autocomplete_items.pop();
    }
}

const autocomplete_items: IAutocompleteItem[] = [];