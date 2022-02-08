import {FolderVariable} from "./FolderVariable";

export class Variable_FolderName extends FolderVariable {
    public static variable_name = "folder_name";
    public static help_text = "Gives the current file's parent folder name. No ancestor folders are included.";

    protected generateValue(): string {
        const folder = this.getFolder();
        if (!folder) {
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return folder.name;
    }
}