import {Notice} from "obsidian";
import {
    Escaper,
    extractFileName,
    PowerShellEscaper,
    ShEscaper,
} from "src/imports";

export function escapeValue(shell: string, raw_value: string) {
    shell = extractFileName(shell.toLowerCase());
    let escaper: Escaper;
    switch (shell) {
        case "bash":
        case "dash":
        case "zsh":
            escaper = new ShEscaper(raw_value);
            break;
        case "powershell.exe":  // PowerShell 5 is only available for Windows.
        case "pwsh.exe":        // In Windows.
        case "pwsh":            // In Linux and Mac. (SC does not actually support using PowerShell on Linux/Mac just yet, but support can be added).
            escaper = new PowerShellEscaper(raw_value);
            break;
        case "cmd.exe":
            // Exception: There is no escaping support for CMD, so all values will be left unescaped when CMD is used. :(
            return raw_value;
        default:
            // Shell was not recognised.
            new Notice("EscapeValue(): Unrecognised shell: " + shell);
            throw new Error("EscapeValue(): Unrecognised shell: " + shell);
    }
    return escaper.escape();
}