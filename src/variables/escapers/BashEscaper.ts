import {AllSpecialCharactersEscaper} from "./AllSpecialCharactersEscaper";

export class BashEscaper extends AllSpecialCharactersEscaper {
    protected prefix = "\\"; // In Bash, escaping should use a backslash, e.g. "Hello, world!" becomes \"Hello\,\ world\!\"
}