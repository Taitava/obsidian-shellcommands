import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";
import {
    normalizePath,
} from "obsidian";
import {
    getEditor,
    getVaultAbsolutePath,
    isInteger,
} from "../Common";
import * as path from "path";

export class OutputChannelDriver_OpenFile extends OutputChannelDriver {
    protected readonly title = "Open a file defined in the output";

    /**
     * This output channel is not suitable for stderr, as stderr can contain unexpected messages.
     * @protected
     */
    protected readonly accepted_output_streams: OutputStream[] = ["stdout"];

    protected _handle(output: OutputStreams, error_code: number | null): void {
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {
            // Get parts that define different details about how the file should be opened
            const file_definition = output[output_stream_name].trim(); // Contains at least a file name, and MAYBE: a caret position, new pane option, and view state
            const file_definition_parts = file_definition.split(":");

            // The first part is always the file path
            let open_file_path = file_definition_parts.shift();

            // Special features
            const caret_position: number[] = []; // If caret position is present in file_definition_parts, the first item in this array will be the caret line, the second will be the column.
            let new_pane: boolean = false;
            let can_create_file: boolean = false;
            let file_definition_interpreting_failed = false;

            file_definition_parts.forEach((file_definition_part: string) => {
                file_definition_part = file_definition_part.toLocaleLowerCase();

                // Determine the part type
                if (isInteger(file_definition_part)) {
                    // This is a number, so consider it as a caret position part.
                    caret_position.push(Math.max(0, parseInt(file_definition_part) - 1)); // Editor position is zero-indexed, line numbers/columns are 1-indexed.
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
                return;
            }

            // Ensure the path is relative
            if (path.isAbsolute(open_file_path)) {
                // The path is absolute.
                // Check if it can be converted to relative.
                let vault_absolute_path: string = getVaultAbsolutePath(this.app);
                if (open_file_path.toLocaleLowerCase().startsWith(vault_absolute_path.toLocaleLowerCase())) {
                    // Converting to relative is possible
                    open_file_path = open_file_path.substr(vault_absolute_path.length); // Get everything after the point where the vault path ends.
                } else {
                    // Cannot convert to relative, because the file does not reside in the vault
                    this.plugin.newError("Cannot open file '" + open_file_path + "' as the path is outside this vault.")
                    return;
                }
            }

            // Clean up the file path
            open_file_path = normalizePath(open_file_path); // normalizePath() is used on purpose, instead of normalizePath2(), because backslashes \ should be converted to forward slashes /

            this.openFileInTab(open_file_path,  new_pane, can_create_file).then(() => {
                // The file is now open
                // Check, did we have a caret position available. If not, do nothing.
                if (caret_position.length > 0) {
                    // Yes, a caret position was defined in the output.
                    // Even though the file is already loaded, rendering it may take some time, thus the height of the content may increase.
                    // For this reason, there needs to be a tiny delay before setting the caret position. If the caret position is set immediately,
                    // the caret will be placed in a correct position, but it might be that the editor does not scroll into correct position, so the
                    // caret might be out of the view, even when it's in a correct place. (Obsidian version 0.13.23).
                    window.setTimeout(() => {
                        const editor = getEditor(this.app)
                        if (editor) {
                            editor.setCursor({
                                line: caret_position[0],
                                ch: caret_position[1] ?? 0,
                            });
                        }
                    }, 500) // 500ms is probably long enough even if a new tab is opened (takes more time than opening a file into an existing tab). This can be made into a setting sometime.
                }
            });
        }
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
            this.plugin.newError("Cannot open file '" + file_path + "', as it does not exist. (If you want to allow file creation, add :can-create-file to the shell command output.)");
        }
    }

}