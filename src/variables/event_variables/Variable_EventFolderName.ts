import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "../../events/SC_Event_FolderMenu";
import {EventVariable} from "./EventVariable";

export class Variable_EventFolderName extends EventVariable {
    public variable_name = "event_folder_name";
    public help_text = "File menu: Gives the selected file's parent folder name. Folder menu: Gives the selected folder's name. No ancestor folders are included.";

    protected supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FolderMenu,
    ];

    protected generateValue(sc_event: SC_Event_FileMenu | SC_Event_FolderMenu): string | null {
        if (!this.checkSC_EventSupport(sc_event)) {
            return null;
        }

        const folder = sc_event.getFolder();
        return folder.name;
    }
}