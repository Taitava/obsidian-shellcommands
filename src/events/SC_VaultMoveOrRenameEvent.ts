/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {SC_VaultEvent} from "./SC_VaultEvent";
import {TShellCommand} from "../TShellCommand";
import {TAbstractFile} from "obsidian";
import {
    extractFileName,
    extractFileParentPath,
} from "../Common";

export abstract class SC_VaultMoveOrRenameEvent extends SC_VaultEvent {
    protected readonly vault_event = "rename";

    /**
     * Tells whether this event should trigger when a file/folder is moved OR renamed.
     * @protected
     */
    protected abstract move_or_rename: "move" | "rename";

    /**
     * The file's old path, gotten from Obsidian's Vault.on("rename"). Only present if this.file_or_folder is "file".
     * @private
     */
    private file_old_relative_path: string;

    /**
     * If this.file_or_folder is "file": The file's parent folder's old path.
     * If this.file_or_folder is "folder": The folder's old path.
     *
     * Relative from the vault's root folder. Gotten from Obsidian's Vault.on("rename").
     * @private
     */
    private folder_old_relative_path: string;

    protected getTrigger(t_shell_command: TShellCommand) {

        // Get a trigger from the parent class (SC_VaultEvent).
        const trigger = super.getTrigger(t_shell_command);

        return async (abstract_file: TAbstractFile, old_relative_path: string) => {

            // Detect if the file/folder was moved or renamed.
            // If the file/folder name has stayed the same, conclude that the file has been MOVED, not renamed. Otherwise, conclude the opposite.
            const old_file_name = extractFileName(old_relative_path);
            const new_file_name = abstract_file.name;
            const event_type = (old_file_name === new_file_name) ? "move" : "rename"; // Tells what really happened. this.move_or_rename tells what is the condition for the event to trigger.

            // Only proceed the triggering, if the determined type equals the one defined by the event class.
            if (event_type === this.move_or_rename) {
                // The event type is correct.

                // File and folder for declareExtraVariables()
                switch (this.file_or_folder) {
                    case "file":
                        this.file_old_relative_path = old_relative_path;
                        this.folder_old_relative_path = extractFileParentPath(old_relative_path);
                        break;
                    case "folder":
                        this.folder_old_relative_path = old_relative_path;
                        break;
                }

                // Call the normal trigger function.
                await trigger(abstract_file);
            }
        };
    }

    public getFolderOldRelativePath() {
        return this.folder_old_relative_path;
    }

    public getFileOldRelativePath() {
        return this.file_old_relative_path;
    }
}