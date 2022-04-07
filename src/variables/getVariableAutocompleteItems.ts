import {
    IAutocompleteItem,
    SC_Plugin,
} from "src/imports";

export function getVariableAutocompleteItems(plugin: SC_Plugin) {
    const autocomplete_items: IAutocompleteItem[] = [];
    plugin.getVariables().forEach((variable) => {
        autocomplete_items.push(...variable.getAutocompleteItems());
    });
    return autocomplete_items;
}