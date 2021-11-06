import {AllSpecialCharactersEscaper} from "./AllSpecialCharactersEscaper";

export class ShEscaper extends AllSpecialCharactersEscaper {
    protected prefix = "\\"; // In *sh, escaping should use a backslash, e.g. "Hello, world!" becomes \"Hello\,\ world\!\"
}