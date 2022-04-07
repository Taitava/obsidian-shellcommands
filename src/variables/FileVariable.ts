import {
    Variable,
} from "src/imports";

export abstract class FileVariable extends Variable {

    protected always_available = false;

    protected getFile() {
        const current_file = this.getActiveFile();
        if (!current_file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null;
        }
        return current_file;
    }

    public isAvailable(): boolean {
        const current_file = this.getActiveFile();
        return !!current_file;
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when the active pane contains a file, not in graph view or other non-file view.";
    }

    private getActiveFile() {
        return this.app.workspace.getActiveFile();
    }
}