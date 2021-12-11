import {Escaper} from "./Escaper";

/**
 * Prefixes all characters that are not letters, numbers or underscores with a prefix character that can be defined by child classes.
 */
export abstract class AllSpecialCharactersEscaper extends Escaper {
    protected abstract prefix: string;

    public escape(): string {
        return this.raw_value.replace(/[^\w\d]/g, (special_character: string) => {  // /g means to replace all occurrences instead of just the first one.
            // Do the replacing in a function in order to avoid a possible $ character to be interpreted by JavaScript to interact with the regex.
            // More information: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter (referenced 2021-11-02.
            return this.prefix + special_character;
        });
    }
}