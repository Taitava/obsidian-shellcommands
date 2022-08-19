/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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

import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";
import {
    EditorSelectionOrCaret,
    normalizePath,
} from "obsidian";
import {
    getEditor,
    getVaultAbsolutePath,
    isInteger,
    isWindows,
    prepareEditorPosition,
} from "../Common";
import * as path from "path";
import {EOL} from "os";
import {debugLog} from "../Debug";

export class OutputChannelDriver_OpenFiles extends OutputChannelDriver {
    protected readonly title = "Open a file";

    public hotkey_letter = "O";

    /**
     * This output channel is not suitable for stderr, as stderr can contain unexpected messages.
     * @protected
     */
    protected readonly accepted_output_streams: OutputStream[] = ["stdout"];

    protected _handle(output: OutputStreams, error_code: number | null): void {
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {

            // Read file definitions. Usually there's just one, but there can be many. Definitions are separated by newline
            // characters. Each file definition defines one file to be opened.
            const file_definitions_string = output[output_stream_name].trim(); // Contains at least file name(s), and MAYBE: a caret position, new pane option, and view state
            const file_definitions = file_definitions_string.split(/[\r\n]+/u);

            // Iterate all file definitions that should be opened.
            let opening_pipeline = Promise.resolve();
            for (const file_definition of file_definitions) {
                // Chain each file opening to happen one after another. If one file opening fails for whatever reason, it
                // is ok to continue to open the next file. This is why .finally() is used instead of .then().
                opening_pipeline = opening_pipeline.finally(() => {
                    return this.interpretFileOpeningDefinition(file_definition);
                });
            }
        }
    }

    private interpretFileOpeningDefinition(file_definition: string): Promise<void> {
        return new Promise((resolve, reject) => {
            debugLog("OutputChannelDriver_OpenFiles: Interpreting file opening definition: " + file_definition);
            // Get parts that define different details about how the file should be opened
            const file_definition_parts = file_definition.split(":");

            // The first part is always the file path
            let open_file_path = file_definition_parts.shift();

            // On Windows: Check if an absolute path was split incorrectly. (E.g. a path starting with "C:\...").
            if (isWindows() && file_definition_parts.length > 0) {
                const combined_path = open_file_path + ":" + file_definition_parts[0];
                if (path.isAbsolute(combined_path)) {
                    // Yes, the first two parts do form an absolute path together, so they should not be split.
                    open_file_path = combined_path;
                    file_definition_parts.shift(); // Remove the second part so that it won't be accidentally processed in the 'Special features' part.
                }
            }

            // Trim the file path, for being able to use cleaner separation between file name and other parts, e.g: MyFile.md : new-pane
            open_file_path = open_file_path.trim();

            // Special features
            const caret_parts: number[] = []; // If caret position is present in file_definition_parts, the first item in this array will be the caret line, the second will be the column. If more parts are present, they will be used for making selections.
            let new_pane = false;
            let can_create_file = false;
            let file_definition_interpreting_failed = false;

            file_definition_parts.forEach((file_definition_part: string) => {
                file_definition_part = file_definition_part.toLocaleLowerCase().trim(); // .trim() is for being able to use cleaner separation between e.g. different selections: MyFile.md:1:1:1:-1 : 5:1:5:-1

                // Determine the part type
                if (isInteger(file_definition_part, true)) {
                    // This is a number, so consider it as a caret position part.
                    caret_parts.push(parseInt(file_definition_part));
                } else {
                    switch (file_definition_part) {
                        case "new-pane":
                            new_pane = true;
                            break;
                        case "can-create-file":
                            can_create_file = true;
                            break;
                        default:
                            this.plugin.newError("Cannot open file: Unrecognised definition part: " + file_definition_part + " in " + file_definition);
                            file_definition_interpreting_failed = true;
                    }
                }
            });
            if (file_definition_interpreting_failed) {
                reject();
                return;
            }

            // Ensure the path is relative
            if (path.isAbsolute(open_file_path)) {
                // The path is absolute.
                // Check if it can be converted to relative.
                const vault_absolute_path: string = getVaultAbsolutePath(this.app);
                if (open_file_path.toLocaleLowerCase().startsWith(vault_absolute_path.toLocaleLowerCase())) {
                    // Converting to relative is possible
                    open_file_path = open_file_path.substr(vault_absolute_path.length); // Get everything after the point where the vault path ends.
                } else {
                    // Cannot convert to relative, because the file does not reside in the vault
                    this.plugin.newError("Cannot open file '" + open_file_path + "' as the path is outside this vault.")
                    reject();
                    return;
                }
            }

            // Clean up the file path
            open_file_path = normalizePath(open_file_path); // normalizePath() is used on purpose, instead of normalizePath2(), because backslashes \ should be converted to forward slashes /

            this.openFileInTab(open_file_path,  new_pane, can_create_file).then(() => {
                // The file is now open
                // Check, did we have a caret position available. If not, do nothing.
                const count_caret_parts: number = caret_parts.length;
                if (count_caret_parts > 0) {
                    // Yes, a caret position was defined in the output.

                    // Ensure the correct amount of caret position parts.
                    // 0 parts: no caret positioning needs to be done (but in this part of code the amount of parts is always greater than 0).
                    // 1 part: caret line is defined, no column.
                    // 2 parts: caret line and column are defined.
                    // 3 parts: NOT ALLOWED.
                    // 4 parts: selection starting position (line, column) and selection end position (line, column) are defined.
                    // 5 parts or more: NOT ALLOWED. Exception: any number of sets of four parts is allowed, i.e. 8 parts, 12 parts, 16 parts etc. are allowed as they can define multiple selections.
                    const error_message_base: string = "File opened, but caret cannot be positioned due to an incorrect amount (" + count_caret_parts + ") of numeric values in the output: " + file_definition + EOL + EOL;
                    if (count_caret_parts == 3) {
                        // Incorrect amount of caret parts
                        this.plugin.newError(error_message_base + "Three numeric parts is an incorrect amount, correct would be 1,2 or 4 parts.");
                        reject();
                        return;
                    } else if (count_caret_parts > 4 && count_caret_parts % 4 !== 0) {
                        // Incorrect amount of caret parts
                        this.plugin.newError(error_message_base + "Perhaps too many numeric parts are defined? If more than four parts are defined, make sure to define complete sets of four parts. The amount of numeric parts needs to be dividable by 4.");
                        reject();
                        return;
                    }

                    // Even though the file is already loaded, rendering it may take some time, thus the height of the content may increase.
                    // For this reason, there needs to be a tiny delay before setting the caret position. If the caret position is set immediately,
                    // the caret will be placed in a correct position, but it might be that the editor does not scroll into correct position, so the
                    // caret might be out of the view, even when it's in a correct place. (Obsidian version 0.13.23).
                    window.setTimeout(() => {
                        const editor = getEditor(this.app)
                        if (editor) {
                            if (count_caret_parts >= 4) {
                                // Selection mode
                                // There can be multiple selections defined
                                const selections: EditorSelectionOrCaret[] = [];
                                while (caret_parts.length) {
                                    const from_line = caret_parts.shift();
                                    const from_column = caret_parts.shift();
                                    const to_line = caret_parts.shift();
                                    const to_column = caret_parts.shift();
                                    selections.push({
                                        anchor: prepareEditorPosition(editor, from_line, from_column),
                                        head: prepareEditorPosition(editor, to_line, to_column),
                                    })
                                }
                                editor.setSelections(selections);
                            } else {
                                // Simple caret mode
                                const caret_line: number = caret_parts[0];
                                const caret_column: number = caret_parts[1] ?? 1;
                                editor.setCursor(prepareEditorPosition(editor, caret_line, caret_column));
                            }

                            // After placing carets / selecting text, have a small delay after allowing to open another file (in case multiple files are opened in a row). This allows the selection to be remembered in the pane's history.
                            window.setTimeout(resolve, 300); // If you change this ADDITIONAL delay, remember to change it in the documentation, too.
                        } else {
                            // No editor
                            this.plugin.newError("File opened, but caret cannot be positioned because no editor was found.");
                            reject();
                        }
                    }, 500); // 500ms is probably long enough even if a new tab is opened (takes more time than opening a file into an existing tab). This can be made into a setting sometime. If you change this, remember to change it in the documentation, too.
                } else {
                    // No caret parts exist. All is done now.
                    resolve();
                }
            }, (error_message: string | unknown) => {
                if (typeof error_message === "string") {
                    // Opening the file has failed.
                    this.plugin.newError(error_message);
                } else {
                    // Some other runtime error has occurred.
                    throw error_message;
                }
                reject();
            });
        });
    }

    private openFileInTab(file_path: string, new_pane: boolean, can_create_file: boolean): Promise<void> {
        // Ensure that the file exists (or can be created)
        const source_path = ""; // TODO: When adding an option for creating new files, read this documentation from Obsidian API's getNewFileParent(): "sourcePath – The path to the current open/focused file, used when the user wants new files to be created “in the same folder”. Use an empty string if there is no active file."
        const file_exists_or_can_be_created = can_create_file || null !== this.app.metadataCache.getFirstLinkpathDest(file_path, source_path);
        if (file_exists_or_can_be_created) {
            // Yes, the file exists (or can be created)
            return this.app.workspace.openLinkText(file_path, source_path, new_pane);
        } else {
            // No, the file does not exist, and it may not be created.
            return Promise.reject("Cannot open file '" + file_path + "', as it does not exist. (If you want to allow file creation, add :can-create-file to the shell command output.)");
        }
    }

}