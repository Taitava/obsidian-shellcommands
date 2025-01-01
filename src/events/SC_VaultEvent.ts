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

import {
    EventCategory,
    SC_Event,
} from "./SC_Event";
import {
    EventRef,
    TAbstractFile,
    TFile,
    TFolder,
} from "obsidian";
import {TShellCommand} from "../TShellCommand";

export abstract class SC_VaultEvent extends SC_Event {
    protected abstract readonly vault_event:
        // TODO: Find a way to make this list dynamic.
        // This list reflects Obsidian API version 0.12.11.
        | "create"
        | "modify"
        | "delete"
        | "rename"
        | "closed" // Not implement by any SC_Event_* class, because I'm not sure if this event is needed. But can be implemented if need be. 2024-02-10: I can't see this event anymore in the Vault class in obsidian.d.ts for Obsidian 1.4.0.
    ;
    protected abstract file_or_folder: "file" | "folder";
    protected file: TFile; // TODO: Create a new class EventOccurrence and move `file` and `folder` properties there, to avoid simultaneous event occurrences affecting each others' properties. (`file_or_folder` should be kept here as it's not occurrence related).
    protected folder: TFolder;

    protected _register(t_shell_command: TShellCommand): false | EventRef {
        // @ts-ignore TODO: Find a way to get a dynamic type for this.vault_event .
        return this.app.vault.on(this.vault_event, this.getTrigger(t_shell_command));
    }

    protected _unregister(event_reference: EventRef): void {
        this.app.vault.offref(event_reference);
    }

    protected getTrigger(t_shell_command: TShellCommand) {
        return async (file: TAbstractFile, ...extra_arguments: unknown[] /* Needed for SC_Event_FileRenamed and SC_Event_FolderRenamed to be able to define an additional parameter.*/) => {

            // Check that it's the correct type of file: if the SC_Event requires a file, 'file' needs to be a TFile, otherwise it needs to be a TFolder.
            if ((this.file_or_folder === "folder" && file instanceof TFolder) || (this.file_or_folder === "file" && file instanceof TFile)) {
                // The file type is correct.

                // File/folder for declareExtraVariables()
                switch (this.file_or_folder) {
                    case "file":
                        this.file = file as TFile;
                        break;
                    case "folder":
                        this.folder = file as TFolder;
                        break;
                }

                await this.trigger(t_shell_command);
            }
        };
    }

    /**
     * This should only be called if file_or_folder is "file"!
     */
    public getFile(): TFile {
        return this.file;
    }

    /**
     * This can be called whether file_or_folder is "file" or "folder".
     */
    public getFolder(): TFolder {
        switch (this.file_or_folder) {
            case "file":
                if (!this.file.parent) {
                    throw new Error("The event file does not have a parent for some strange reason.");
                }
                return this.file.parent;
            case "folder":
                return this.folder;
        }
    }

    public getCategory(): EventCategory {
        return this.file_or_folder;
    }
}