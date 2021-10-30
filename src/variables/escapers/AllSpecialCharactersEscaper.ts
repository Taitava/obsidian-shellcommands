import {Escaper} from "./Escaper";

/**
 * Prefixes all characters that are not letters, numbers or underscores with a prefix character that can be defined by child classes.
 */
export abstract class AllSpecialCharactersEscaper extends Escaper {
    protected abstract prefix: string;

    public escape(): string {
        return this.raw_value.replace(/[^\w\d]/g, this.prefix + "$&"); // /g means to replace all occurrences instead of just the first one. $& means "the whole match".
    }
}