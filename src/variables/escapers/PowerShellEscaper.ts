import {
    AllSpecialCharactersEscaper,
} from "src/imports";

export class PowerShellEscaper extends AllSpecialCharactersEscaper {
    protected prefix = "`"; // In PowerShell, escaping should use a ` character, e.g. "Hello, world!" becomes `"Hello`,` world`!`"
}