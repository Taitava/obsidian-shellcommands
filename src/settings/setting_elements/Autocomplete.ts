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

import autocomplete from "autocompleter";
import {parseYaml} from "obsidian";
import SC_Plugin from "../../main";
import {getVariableAutocompleteItems} from "../../variables/getVariableAutocompleteItems";

/**
 *
 * @param plugin Used for getting a list of Variable autocomplete items.
 * @param input_element
 * @param call_on_completion A function that will be called when a user has selected a suggestion and performed the autocomplete action. onChange event will not be called, because it would trigger opening the autocomplete menu again, so that's why a separate callback is used.
 */
export function createAutocomplete(plugin: SC_Plugin, input_element: HTMLInputElement | HTMLTextAreaElement, call_on_completion: (field_value: string) => void) {

    autocomplete<IAutocompleteItem>({
        input: input_element,
        fetch: (input_value_but_not_used: string, update: (items: IAutocompleteItem[]) => void) => {
            const autocomplete_items = merge_and_sort_autocomplete_items(getVariableAutocompleteItems(plugin), CustomAutocompleteItems);
            const max_suggestions = 30;

            // Get the so far typed text - exclude everything that is on the right side of the caret.
            const caret_position = input_element.selectionStart;
            const typed_text = input_element.value.slice(0, caret_position);
            const search_query = get_search_query(typed_text);

            if ("" === search_query.search_text) {
                // No suggestions for empty word.
                update([]);
            } else {
                // The word is not empty, so can suggest something.
                let matched_items = autocomplete_items.filter(item => item_match(item, search_query));
                matched_items = matched_items.slice(0, max_suggestions); // Limit to a reasonable amount of suggestions.
                update(matched_items);
            }
        },
        onSelect: (item) => {
            // A user has selected an item to be autocompleted

            // Get the item text and already typed text
            let supplement = item.value;
            let caret_position = input_element.selectionStart;
            const typed_text = input_element.value.slice(0, caret_position);
            const search_query = get_search_query(typed_text);
            const search_text = search_query.search_text;

            // Special case: Check if }} happens to appear after the caret
            const after_caret = input_element.value.slice(caret_position, caret_position + 2);
            if ("}}" === after_caret) {
                // The replacing will happen in a {{variable}}.
                // Do not accidentally insert another }} pair.
                supplement = supplement.replace(/\}\}$/u, ""); // Only removes a trailing }} if there is one.
            }

            // Try to save part of the beginning, in case it seems like not being part of the search query.
            let replace_start = find_starting_position(search_text, supplement); // The length difference of typed_text and search_text will be added here below.
            if (false === replace_start) {
                // This should never happen, but if it does, do not replace anything, just insert.
                replace_start = caret_position;
            } else {
                // Adjust the position
                replace_start += typed_text.length - search_text.length;
            }

            // Choose a method for doing the inserting
            if (undefined !== document.execCommand) {
                // execCommand() is deprecated, but available.
                // Use it to do the insertion, because this way an undo history can be preserved.
                input_element.setSelectionRange(replace_start, caret_position); // First select the part that will be replaced, because execCommand() does not support defining positions. This adds a cumbersome selection step to the undo history, but at least undoing works.
                document.execCommand("insertText", false, supplement);
            } else {
                // execCommand() is not available anymore.
                // Use setRangeText() to do the insertion. It will clear undo history, but at least the insertion works.
                input_element.setRangeText(supplement, replace_start, caret_position);
            }

            // Move the caret to a logical continuation point
            caret_position = replace_start + supplement.length;
            if (supplement.match(/:\}\}$/u)) {
                // Place the caret after the colon, instead of after }}.
                caret_position -= 2;
            }
            input_element.setSelectionRange(caret_position, caret_position);

            // Call a hook
            call_on_completion(input_element.value);
        },
        render: (item) => {
            const div_element = document.createElement("div");
            div_element.createSpan({text: item.value, attr: {class: "SC-autocomplete-value"}});
            if (item.help_text) {
                div_element.createSpan({text: ": ", attr: {class: "SC-autocomplete-separator"}});
                div_element.createSpan({attr: {class: "SC-autocomplete-help-text"}}).insertAdjacentHTML("beforeend", item.help_text);
            }
            return div_element;
        },
        minLength: 2, // Minimum length when autocomplete menu should pop up.
        className: "SC-autocomplete", // The component always has a class 'autocomplete', but add 'SC-autocomplete' so that SC's CSS can target 'SC-autocomplete', so it will not mess up stuff if Obsidian happens to have an element with class 'autocomplete'.
        keysToIgnore: [ 38 /* Up */, 13 /* Enter */, 27 /* Esc */, 16 /* Shift */, 17 /* Ctrl */, 18 /* Alt */, 20 /* CapsLock */, 91 /* WindowsKey */, 9 /* Tab */ ], // Defined just to prevent ignoring left and right keys.
        preventSubmit: true, // Prevents creating newlines in textareas when enter is pressed in the autocomplete menu.
    });
}

export interface IAutocompleteItem {
    help_text: string;
    value: string;
    group: string;
    type: AutocompleteSearchQueryType;
}

function item_match(item: IAutocompleteItem, search_query: IAutocompleteSearchQuery): boolean {
    const item_value = item.value.toLocaleLowerCase();
    const search_text = search_query.search_text.toLocaleLowerCase();

    // Match query type
    if (item.type !== search_query.search_type) {
        // If the query type is different, do not include this item.
        // This can happen e.g. if {{ is typed, and the item is not a variable, or {{! is typed, and the item is not an unescaped variable.
        return false;
    }

    // Match text
    let search_character: string;
    let search_position = 0;
    for (let search_character_index = 0; search_character_index < search_text.length; search_character_index++) {
        search_character = search_text[search_character_index];
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
        const partial_supplement = supplement.slice(0, supplement_index);
        if (typed_text.contains(partial_supplement)) {
            return typed_text.indexOf(partial_supplement);
        }
    }
    return false;
}


const CustomAutocompleteItems: IAutocompleteItem[] = [];

export function addCustomAutocompleteItems(custom_autocomplete_yaml: string) {

    // Ensure the content is not empty
    if (0 === custom_autocomplete_yaml.trim().length) {
        return "The content is empty.";
    }

    // Try to parse YAML syntax
    let yaml: any;
    try {
        yaml = parseYaml(custom_autocomplete_yaml);
    } catch (error) {
        // A syntax error has appeared.
        return error.message;
    }
    if (null === yaml || typeof yaml !== "object") {
        return "Unable to parse the content due to unknown reason."
    }

    // Iterate autocomplete item groups
    const group_names = Object.getOwnPropertyNames(yaml);
    const error_messages: string[] = [];
    group_names.forEach((group_name: string) => {
        const group_items = yaml[group_name];
        const group_item_values = Object.getOwnPropertyNames(group_items);

        // Iterate all autocomplete items in the group
        group_item_values.forEach((autocomplete_item_value: string) => {
            const autocomplete_item_label = group_items[autocomplete_item_value];
            if (typeof autocomplete_item_label !== "string") {
                error_messages.push("Autocomplete item '" + autocomplete_item_value + "' has an incorrect help text type: " + autocomplete_item_label + " is a " + typeof autocomplete_item_label + ", but it should be a string.");
                return;
            }

            // Determine a correct type for the item
            let type: AutocompleteSearchQueryType = "other";
            if (autocomplete_item_value.startsWith("{{")) {
                // This is a variable
                type = "normal-variable";
            }

            // The item is ok, add it to the list
            CustomAutocompleteItems.push({
                value: autocomplete_item_value,
                help_text: autocomplete_item_label,
                group: group_name,
                type: type,
            });

            if (type === "normal-variable") {
                // Add an unescaped version of the variable, too
                CustomAutocompleteItems.push({
                    value: autocomplete_item_value.replace(/^\{\{/u, "{{!"), // Add an exclamation mark to the variable name.
                    help_text: autocomplete_item_label,
                    group: group_name,
                    type: "unescaped-variable",
                });
            }
        });
    });
    if (error_messages.length > 0) {
        // Something failed
        return error_messages.join("; ");
    }

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

type AutocompleteSearchQueryType = "other" | "normal-variable" | "unescaped-variable";
interface IAutocompleteSearchQuery {
    search_text: string;
    search_type: AutocompleteSearchQueryType;
}

/**
 * Reduces an input string to the nearest logical word.
 * @param typed_text
 */
function get_search_query(typed_text: string): IAutocompleteSearchQuery {
    let search_text = typed_text.match(/\S*?$/u)[0]; // Reduce the text - limit to a single word (= exclude spaces and everything before them).
    let search_type: AutocompleteSearchQueryType = "other"; // May be overwritten.

    if (search_text.contains("}}")) {
        // The query happens right after a {{variable}}.
        // Make the query string to start after the }} pair, i.e. remove }} and everything before it. This improves the search.
        search_text = search_text.replace(/.+\}\}/u, "");
    }
    if (search_text.contains("{{")) {
        // A {{variable}} is being queried.
        // Make the query string to start from the {{ pair, i.e. remove everything before {{ . This improves the search.
        search_text = search_text.replace(/.+\{\{/u, "{{");
        if (search_text.contains("{{!")) {
            // An _unescaped_ variable is searched for.
            search_type = "unescaped-variable";
        } else {
            // A normal variable is searched for.
            search_type = "normal-variable";
        }
    }
    return {
        search_text: search_text,
        search_type: search_type,
    };
}