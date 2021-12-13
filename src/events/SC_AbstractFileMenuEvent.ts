import {SC_WorkspaceEvent} from "./SC_WorkspaceEvent";
import {TShellCommand} from "../TShellCommand";
import {Menu, TAbstractFile, TFile, TFolder, WorkspaceLeaf} from "obsidian";

export abstract class SC_AbstractFileMenuEvent extends SC_WorkspaceEvent {
    protected abstract file_or_folder: "file" | "folder";
    protected readonly workspace_event = "file-menu";
    protected file: TFile;
    protected folder: TFolder;

    protected getTrigger(original_t_shell_command: TShellCommand) {
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

                // Parse shell command variables and get a title
                let use_t_shell_command = original_t_shell_command
                const preparsed_t_shell_command = original_t_shell_command.preparseVariables(this.declareExtraVariables(use_t_shell_command));
                if (preparsed_t_shell_command) {
                    use_t_shell_command = preparsed_t_shell_command;
                }

                // Add a menu item.
                menu.addItem(item => item
                    .setTitle(use_t_shell_command.getAlias() || use_t_shell_command.getShellCommand())
                    .onClick(() => {
                        this.trigger(original_t_shell_command);
                    }),
                );
            }
        };
    }
}
