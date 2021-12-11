import {getVariableClasses} from "./VariableLists";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";

export function getVariableAutocompleteItems() {
    let autocomplete_items: IAutocompleteItem[] = [];
    getVariableClasses().forEach((variable_class) => {
        autocomplete_items.push(...variable_class.getAutocompleteItems());
    });
    return autocomplete_items;
}