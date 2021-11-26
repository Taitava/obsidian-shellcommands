import autocomplete from "autocompleter";

export function createAutocomplete(input_element: HTMLInputElement, autocomplete_items: IAutocompleteItem[]) {
    autocomplete<IAutocompleteItem>({
        input: input_element,
        fetch: (input_value_but_not_used: string, update: (items: IAutocompleteItem[]) => void) => {

            // Get the so far typed text - exclude everything that is on the right side of the caret.
            let caret_position = input_element.selectionStart;
            const typed_text = input_element.value.slice(0, caret_position);

            // Reduce the text - limit to a single word (= exclude spaces and everything before them).
            let typed_word = typed_text.match(/\S*?$/)[0];
            if (typed_word.contains("{{")) {
                // A {{variable}} is being queried.
                // Make the query string to start from the {{ pair, i.e. remove everything before {{ . This improves the search.
                typed_word = typed_word.replace(/.+{{/, "{{");
            }
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
            const supplement = item.value;
            let caret_position = input_element.selectionStart;
            const typed_text = input_element.value.slice(0, caret_position);

            // Replace the input, but try to save part of the beginning, in case it seems like not being part of the search query.
            let replace_start = find_starting_position(typed_text, supplement);
            if (false === replace_start) {
                // This should never happen, but if it does, do not replace anything, just insert.
                replace_start = caret_position;
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
        minLength: 2, // Minimum length when autocomplete menu should pop up.
        className: "SC-autocomplete", // The component always has a class 'autocomplete', but add 'SC-autocomplete' so that SC's CSS can target 'SC-autocomplete', so it will not mess up stuff if Obsidian happens to have an element with class 'autocomplete'.
    });
}

export interface IAutocompleteItem {
    label: string;
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