import {TFolder} from "obsidian";
import {ShellCommandFileVariable} from "./ShellCommandFileVariable";

export abstract class ShellCommandFolderVariable extends ShellCommandFileVariable {

    private current_folder: TFolder;

    protected getFolder() {
        if (!this.current_folder) {
            // Default folder: current file's parent folder.
            const file = this.getFile();
            if (!file) {
                return null;
            }
            this.current_folder = file.parent;
            if (!this.current_folder) {
                // Still no folder.
                this.newErrorMessage("The current file does not have a parent for some strange reason.")
                return null;
            }
        }
        return this.current_folder;
    }

    /**
     * If this is used, it overrides setFile(), because getFile() will never be called when an explicit folder is set.
     * If this is not used, then getFolder() will call getFile() and use its parent folder.
     *
     * @param folder
     */
    public setFolder(folder: TFolder) {
        this.current_folder = folder;
        return this; // Chainable
    }
}