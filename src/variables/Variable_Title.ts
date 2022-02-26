import {FileVariable} from "./FileVariable";

export class Variable_Title extends FileVariable{
    public static variable_name = "title";
    public static help_text = "Gives the current file name without a file extension. If you need it with the extension, use {{file_name}} instead.";

    protected generateValue(): string {
        const active_file = this.getFile();
        if (active_file) {
            return active_file.basename;
        }
        return null;
    }
}