import {
    SC_AbstractFileMenuEvent,
} from "src/imports";


export class SC_Event_FolderMenu extends SC_AbstractFileMenuEvent {
    protected static readonly event_code = "folder-menu";
    protected static readonly event_title = "Folder menu";
    protected file_or_folder: "folder" = "folder";

    public getFolder() {
        return this.folder;
    }
}