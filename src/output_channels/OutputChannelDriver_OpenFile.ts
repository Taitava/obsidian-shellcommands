import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";
import {EditorPosition, getLinkpath, normalizePath} from "obsidian";
import {getEditor, getVaultAbsolutePath, normalizePath2} from "../Common";
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
            const file_path_and_caret_position = output[output_stream_name].trim(); // Contains at least a file name, and MAYBE a caret position, too.
            const caret_position_pattern = /:(\d+)(:(\d+))?$/;

            let open_file_path: string;
            let caret_position: EditorPosition;

            // Check if the output contains a caret position, too.
            let caret_position_match = file_path_and_caret_position.match(caret_position_pattern);
            if (caret_position_match) {
                // Yes, it contains a caret position
                caret_position = {
                    line: Math.max(0, parseInt(caret_position_match[1]) - 1), // Editor position is zero-indexed, line numbers are 1-indexed
                    ch: caret_position_match[3] ? Math.max(0, parseInt(caret_position_match[3]) - 1) : 0, // Editor position is zero-indexed, column positions are 1-indexed
                };

                // Remove the caret position from the file name
                open_file_path = file_path_and_caret_position.replace(caret_position_pattern, "");
            } else {
                // No, there's no caret position
                open_file_path = file_path_and_caret_position;
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


            // Ensure that the file exists
            const source_path = ""; // TODO: When adding an option for creating new files, read this documentation from Obsidian API's getNewFileParent(): "sourcePath – The path to the current open/focused file, used when the user wants new files to be created “in the same folder”. Use an empty string if there is no active file."
            if (null !== this.app.metadataCache.getFirstLinkpathDest(open_file_path, source_path)) {
                // Yes, the file exists
                this.app.workspace.openLinkText(open_file_path, source_path).then(() => {
                    // The file is now open
                    // Check, did we have a caret position available. If not, do nothing.
                    if (caret_position) {
                        // Yes, a caret position was defined in the output.
                        // Even though the file is already loaded, rendering it may take some time, thus the height of the content may increase.
                        // For this reason, there needs to be a tiny delay before setting the caret position. If the caret position is set immediately,
                        // the caret will be placed in a correct position, but it might be that the editor does not scroll into correct position, so the
                        // caret might be out of the view, even when it's in a correct place. (Obsidian version 0.13.23).
                        // Use a delay of 0 milliseconds, i.e. it will happen very soon.
                        window.setTimeout(() => {
                            const editor = getEditor(this.app)
                            if (editor) {
                                editor.setCursor(caret_position);
                            }
                        }, 0)
                    }
                });
            }else {
                // No, the file does not exist
                this.plugin.newErrors([
                    "Cannot open file '" + open_file_path + "', as it does not exist.",
                    "The Shell commands plugin does not currently offer a way to create a new file in this kind of situation, but an option for this might be added later.",
                ]);
            }
        }
    }

}