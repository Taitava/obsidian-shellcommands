import {Menu, TAbstractFile, TFile, TFolder, WorkspaceLeaf} from "obsidian";
import {
    SC_MenuEvent,
    TShellCommand,
} from "src/imports";

export abstract class SC_AbstractFileMenuEvent extends SC_MenuEvent {
    protected abstract file_or_folder: "file" | "folder";
    protected readonly workspace_event = "file-menu";
    protected file: TFile;
    protected folder: TFolder;

    protected getTrigger(t_shell_command: TShellCommand) {
        return (menu: Menu, file: TAbstractFile, source: string, leaf?: WorkspaceLeaf) => {
            // Check that it's the correct menu: if the SC_Event requires a folder menu, 'file' needs to be a TFile, otherwise it needs to be a TFolder.
            if ((this.file_or_folder === "folder" && file instanceof TFolder) || (this.file_or_folder === "file" && file instanceof TFile)) {
                // The menu is correct.

                // File/folder for declareExtraVariables()
                switch (this.file_or_folder) {
                    case "file":
                        this.file = file as TFile;
                        break;
                    case "folder":
                        this.folder = file as TFolder
                        break;
                }

                this.addTShellCommandToMenu(t_shell_command, menu);
            }
        };
    }
}
