import {FileVariable} from "./FileVariable";

export abstract class FolderVariable extends FileVariable {

    protected getFolder() {
        // Get current file's parent folder.
        const file = this.getFile();
        if (!file) {
            return null;
        }
        const current_folder = file.parent;
        if (!current_folder) {
            // No parent folder.
            this.newErrorMessage("The current file does not have a parent for some strange reason.")
            return null;
        }
        return current_folder;
    }
}