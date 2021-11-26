import autocomplete from "autocompleter";

export function createAutocomplete(input_element: HTMLInputElement, autocomplete_items: IAutocompleteItem[]) {
    autocomplete<IAutocompleteItem>({
        input: input_element,
        fetch: (typed_text: string, update: (items: IAutocompleteItem[]) => void) => {
            const typed_word = typed_text.match(/\S*$/)[0];
            if ("" === typed_word) {
                // No suggestions for empty word.
                update([]);
            } else {
                // The word is not empty, so can suggest something.
                update(autocomplete_items.filter(item => item.value.toLocaleLowerCase().startsWith(typed_word.toLocaleLowerCase())));
            }
        },
        onSelect: (item) => {
            // A user has selected an item to be autocompleted

            // Get the item text, but reduce already typed characters from its beginning.
            let caret_position = input_element.selectionStart;
            const input_so_far = input_element.value.slice(0, caret_position); // FIXME: If a user has typed characters with incorrect case, those should be corrected.
            const filler = melt_string(input_so_far, item.value);

            // Insert the completion
            console.log(input_so_far + ", " + item.value + " = " + filler);
            input_element.setRangeText(filler);

            // Move the caret to a logical continuation point
            caret_position += filler.length
            if (filler.match(/:}}$/)) {
                // Place the caret after the colon, instead of after }}.
                caret_position -= 2;
            }
            input_element.setSelectionRange(caret_position, caret_position);

            // Call onChange hooks
            // FIXME: Does not work. Does not cause command descriptions to be updated.
            input_element.dispatchEvent(new InputEvent("change", {
                bubbles: true,
                cancelable: false,
                data: filler,
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

/**
 * Removes all characters from the beginning of 'meltable' that match with the characters on the end of 'melter'. Case is ignored.
 *
 * @param melter
 * @param meltable
 */
function melt_string(melter: string, meltable: string) {
    for (let melter_index = 0; melter_index < melter.length-1; melter_index++) {
        const melt_candidate_length = melter.length - melter_index;
        const melt_candidate = meltable.slice(0, melt_candidate_length);
        if (melter.toLowerCase().endsWith(melt_candidate.toLowerCase())) {
            // Found common characters that can be melted.
            return meltable.slice(melt_candidate_length);
        }
    }
    // No melting is possible, the strings are so different.
    return meltable;
}