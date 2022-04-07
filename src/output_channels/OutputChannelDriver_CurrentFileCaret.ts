import {Editor} from "obsidian";
import {
    OutputChannelDriver_CurrentFile,
} from "src/imports";

export class OutputChannelDriver_CurrentFileCaret extends OutputChannelDriver_CurrentFile {
    protected readonly title = "Current file: caret position";

    /**
     * Inserts text into the given editor, at caret position.
     *
     * @param editor
     * @param output_message
     * @protected
     */
    protected insertIntoEditor(editor: Editor, output_message: string): void {
        editor.replaceSelection(output_message);
    }
}