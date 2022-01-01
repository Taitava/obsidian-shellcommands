import {ShellCommandVariable} from "./ShellCommandVariable";

export abstract class ShellCommandFileVariable extends ShellCommandVariable {

    protected getFile() {
        const current_file = this.app.workspace.getActiveFile();
        if (!current_file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null;
        }
        return current_file;
    }

    public static getAvailabilityText(): string {
        return "<strong>Only available</strong> when the active pane contains a file, not in graph view or other non-file view.";
    }
}