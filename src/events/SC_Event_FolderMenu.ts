import {SC_AbstractFileMenuEvent} from "./SC_AbstractFileMenuEvent";

export class SC_Event_FolderMenu extends SC_AbstractFileMenuEvent {
    protected readonly event_code = "folder-menu";
    protected readonly event_title = "Folder menu";
    protected file_or_folder: "folder" = "folder";

    public getFolder() {
        return this.folder;
    }
}