import {
    AllSpecialCharactersEscaper,
} from "src/imports";

export class ShEscaper extends AllSpecialCharactersEscaper {
    protected prefix = "\\"; // In *sh, escaping should use a backslash, e.g. "Hello, world!" becomes \"Hello\,\ world\!\"

    public escape(): string {
        return this.replace_newlines(super.escape());
    }

    /**
     * Converts escaped newline characters to a form that the Bourne family shells will interpret as literal newlines,
     * not as ignorable characters.
     *
     * @param escaped_value
     * @private
     */
    private replace_newlines(escaped_value: string): string {
        return escaped_value
            .replaceAll(this.prefix+"\r", this.prefix+this.prefix+"r") // Replace a real linefeed with a literal "\\r".
            .replaceAll(this.prefix+"\n", this.prefix+this.prefix+"n") // Replace a real newline with a literal "\\n".
        ;
    }
}