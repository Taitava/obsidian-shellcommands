import {SC_Event_FileMenu} from "../../events/SC_Event_FileMenu";
import {SC_Event_FolderMenu} from "../../events/SC_Event_FolderMenu";
import {EventVariable} from "./EventVariable";

export class Variable_EventFolderName extends EventVariable {
    static variable_name = "event_folder_name";
    static help_text = "File menu: Gives the selected file's parent folder name. Folder menu: Gives the selected folder's name. No ancestor folders are included.";

    protected static supported_sc_events = [
        SC_Event_FileMenu,
        SC_Event_FolderMenu,
    ];

    protected generateValue(): string | null {
        if (!this.checkSC_EventSupport()) {
            return null;
        }

        const folder = (this.sc_event as SC_Event_FileMenu | SC_Event_FolderMenu).getFolder();
        return folder.name;
    }
}