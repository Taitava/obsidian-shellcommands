import {TFile, TFolder} from "obsidian";
import {
    SC_AbstractFileMenuEvent,
} from "src/imports";

export class SC_Event_FileMenu extends SC_AbstractFileMenuEvent {
    protected static readonly event_code = "file-menu";
    protected static readonly event_title = "File menu";
    protected file_or_folder: "file" = "file";

    public getFile(): TFile {
        return this.file;
    }

    public getFolder(): TFolder {
        return this.file.parent;
    }
}