import {ShellCommandVariable} from "./ShellCommandVariable";
import {TFile} from "obsidian";

export abstract class ShellCommandFileVariable extends ShellCommandVariable {

    private current_file = this.app.workspace.getActiveFile();

    protected getFile() {
        if (!this.current_file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null;
        }
        return this.current_file;
    }

    public setFile(file: TFile) {
        this.current_file = file;
        return this; // Chainable
    }
}