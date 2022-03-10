import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";
import SC_Plugin from "../main";

export function getVariableAutocompleteItems(plugin: SC_Plugin) {
    const autocomplete_items: IAutocompleteItem[] = [];
    plugin.getVariables().forEach((variable) => {
        autocomplete_items.push(...variable.getAutocompleteItems());
    });
    return autocomplete_items;
}