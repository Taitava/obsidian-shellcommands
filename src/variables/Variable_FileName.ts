import {FileVariable} from "./FileVariable";

export class Variable_FileName extends FileVariable {
    public variable_name = "file_name";
    public help_text = "Gives the current file name with a file extension. If you need it without the extension, use {{title}} instead.";

    protected generateValue(): string {
        const file = this.getFile();
        if (!file) {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.name;
    }
}