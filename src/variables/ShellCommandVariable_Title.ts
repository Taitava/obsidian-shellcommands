import {ShellCommandFileVariable} from "./ShellCommandFileVariable";

export class ShellCommandVariable_Title extends ShellCommandFileVariable{
    static variable_name = "title";
    static help_text = "Gives the current file name without a file extension. If you need it with the extension, use {{file_name}} instead.";

    generateValue(): string {
        const active_file = this.getFile();
        if (active_file) {
            return active_file.basename;
        }
        return null;
    }
}