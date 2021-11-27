import autocomplete from "autocompleter";
import {parseYaml} from "obsidian";

export function createAutocomplete(input_element: HTMLInputElement, autocomplete_items: IAutocompleteItem[]) {
    autocomplete_items = merge_and_sort_autocomplete_items(autocomplete_items, CustomAutocompleteItems);

    /**
     * Reduces an input string to the nearest logical word.
     * @param typed_text
     */
    function get_typed_word(typed_text: string) {
        // Reduce the text - limit to a single word (= exclude spaces and everything before them).
        let typed_word = typed_text.match(/\S*?$/)[0];
        if (typed_word.contains("{{")) {
            // A {{variable}} is being queried.
            // Make the query string to start from the {{ pair, i.e. remove everything before {{ . This improves the search.
            typed_word = typed_word.replace(/.+{{/, "{{");
        }
        if (typed_word.contains("}}")) {
            // The query happens right after a {{variable}}.
            // Make the query string to start after the }} pair, i.e. remove }} and everything before it. This improves the search.
            typed_word = typed_word.replace(/.+}}/, "");
        }
        return typed_word;
    }

    autocomplete<IAutocompleteItem>({
        input: input_element,
        fetch: (input_value_but_not_used: string, update: (items: IAutocompleteItem[]) => void) => {

            // Get the so far typed text - exclude everything that is on the right side of the caret.
            let caret_position = input_element.selectionStart;
            const typed_text = input_element.value.slice(0, caret_position);
            const typed_word = get_typed_word(typed_text);

            if ("" === typed_word) {
                // No suggestions for empty word.
                update([]);
            } else {
                // The word is not empty, so can suggest something.
                update(autocomplete_items.filter(item => item_match(item, typed_word)));
            }
        },
        onSelect: (item) => {
            // A user has selected an item to be autocompleted

            // Get the item text and already typed text
            let supplement = item.value;
            let caret_position = input_element.selectionStart;
            const typed_text = input_element.value.slice(0, caret_position);
            const typed_word = get_typed_word(typed_text);

            // Special case: Check if }} happens to appear after the caret
            const after_caret = input_element.value.slice(caret_position, caret_position + 2);
            if ("}}" === after_caret) {
                // The replacing will happen in a {{variable}}.
                // Do not accidentally insert another }} pair.
                supplement = supplement.replace(/}}$/, ""); // Only removes a trailing }} if there is one.
            }

            // Replace the input, but try to save part of the beginning, in case it seems like not being part of the search query.
            let replace_start = find_starting_position(typed_word, supplement); // The length difference of typed_text and typed_word will be added here below.
            if (false === replace_start) {
                // This should never happen, but if it does, do not replace anything, just insert.
                replace_start = caret_position;
            } else {
                // Adjust the position
                replace_start += typed_text.length - typed_word.length;
            }
            input_element.setRangeText(supplement, replace_start, caret_position);

            // Move the caret to a logical continuation point
            caret_position = replace_start + supplement.length;
            if (supplement.match(/:}}$/)) {
                // Place the caret after the colon, instead of after }}.
                caret_position -= 2;
            }
            input_element.setSelectionRange(caret_position, caret_position);

            // Call onChange hooks
            // FIXME: Does not work. Does not cause command descriptions to be updated.
            input_element.dispatchEvent(new InputEvent("change", {
                bubbles: true,
                cancelable: false,
                data: supplement,
                inputType: "insertText",
            }));
        },
        render: (item) => {
            const div_element = document.createElement("div");
            div_element.createSpan({text: item.value, attr: {class: "SC-autocomplete-value"}});
            div_element.createSpan({text: ": ", attr: {class: "SC-autocomplete-separator"}});
            div_element.createSpan({text: item.help_text, attr: {class: "SC-autocomplete-help-text"}});
            return div_element;
        },
        minLength: 2, // Minimum length when autocomplete menu should pop up.
        className: "SC-autocomplete", // The component always has a class 'autocomplete', but add 'SC-autocomplete' so that SC's CSS can target 'SC-autocomplete', so it will not mess up stuff if Obsidian happens to have an element with class 'autocomplete'.
    });
}

export interface IAutocompleteItem {
    help_text: string;
    value: string;
    group: string;
}

function item_match(item: IAutocompleteItem, search_string: string): boolean {
    const item_value = item.value.toLocaleLowerCase();
    search_string = search_string.toLocaleLowerCase();

    // Special for {{variables}}: The search query must have an opening {{ pair
    if (item_value.startsWith("{{")) {
        // The autocomplete item is a variable
        // If the search query does not contain {{ too, variables should not be suggested.
        if (!search_string.contains("{{")) {
            return false;
        }
    }

    // Normal search
    let search_character: string;
    let search_position = 0;
    for (let search_character_index = 0; search_character_index < search_string.length; search_character_index++) {
        search_character = search_string[search_character_index];
        if (item_value.includes(search_character, search_position)) {
            // This character was found in item_value.
            search_position = item_value.indexOf(search_character, search_position) + 1;
        } else {
            // This character was not found.
            return false;
        }
    }
    return true;
}

function find_starting_position(typed_text: string, supplement: string) {
    typed_text = typed_text.toLocaleLowerCase();
    supplement = supplement.toLocaleLowerCase();
    for (let supplement_index = supplement.length; supplement_index >= 0; supplement_index--) {
        let partial_supplement = supplement.slice(0, supplement_index);
        if (typed_text.contains(partial_supplement)) {
            return typed_text.indexOf(partial_supplement);
        }
    }
    return false;
}


const CustomAutocompleteItems: IAutocompleteItem[] = [];

export function addCustomAutocompleteItems(custom_autocomplete_yaml: string) {
    // Try to parse YAML syntax
    const yaml = parseYaml(custom_autocomplete_yaml);
    if (null === yaml || typeof yaml !== "object") {
        return "Unable to parse the content."
    }

    // Iterate autocomplete item groups
    const group_names = Object.getOwnPropertyNames(yaml);
    group_names.forEach((group_name: string) => {
        const group_items = yaml[group_name];
        const group_item_values = Object.getOwnPropertyNames(group_items);

        // Iterate all autocomplete items in the group
        group_item_values.forEach((autocomplete_item_value: string) => {
            const autocomplete_item_label = group_items[autocomplete_item_value];
            if (typeof autocomplete_item_label !== "string") {
                return "Autocomplete item '" + autocomplete_item_value + "' has an incorrect help text type: " + typeof autocomplete_item_label;
            }

            // The item is ok, add it to the list
            CustomAutocompleteItems.push({
                value: autocomplete_item_value,
                help_text: autocomplete_item_label,
                group: group_name,
            });
        });
    });

    // All ok
    return true;
}

function merge_and_sort_autocomplete_items(...autocomplete_item_sets: IAutocompleteItem[][]) {
    const merged_autocomplete_items: IAutocompleteItem[] = [].concat(...autocomplete_item_sets);
    return merged_autocomplete_items.sort((a, b) => {
        // First compare groups
        if (a.group < b.group) {
            // a's group should come before b's group.
            return -1;
        } else if (a.group > b.group) {
            // a's group should come after b's group.
            return 1;
        } else {
            // The groups are the same.
            // Compare values.
            if (a.value < b.value) {
                // a should come before b.
                return -1;
            } else if (a.value > b.value) {
                // a should come after b.
                return 1;
            } else {
                // The values are the same.
                // The order does not matter.
                return 0;
            }
        }
    });
}