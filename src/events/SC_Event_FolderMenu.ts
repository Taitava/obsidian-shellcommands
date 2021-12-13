import {SC_AbstractFileMenuEvent} from "./SC_AbstractFileMenuEvent";

export class SC_Event_FolderMenu extends SC_AbstractFileMenuEvent {
    protected readonly event_name = "folder-menu";
    protected readonly event_title = "Folder menu";
    protected file_or_folder: "folder" = "folder";

    // TODO: Declare {{event_folder_name}} and {{event_folder_path}} variables.
}