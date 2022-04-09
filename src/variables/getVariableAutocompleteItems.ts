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