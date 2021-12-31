import {ShellCommandFileVariable} from "./ShellCommandFileVariable";

export class ShellCommandVariable_FileName extends ShellCommandFileVariable {
    static variable_name = "file_name";
    static help_text = "Gives the current file name with a file extension. If you need it without the extension, use {{title}} instead.";

    generateValue(): string {
        let file = this.getFile();
        if (!file) {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.name;
    }
}