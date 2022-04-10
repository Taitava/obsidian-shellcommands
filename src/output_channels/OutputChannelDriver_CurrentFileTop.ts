import {OutputChannelDriver_CurrentFile} from "./OutputChannelDriver_CurrentFile";
import {Editor} from "obsidian";

export class OutputChannelDriver_CurrentFileTop extends OutputChannelDriver_CurrentFile {
    protected readonly title = "Current file: top";

    public hotkey_letter = "T";

    /**
     * Inserts text into the given editor, at top.
     *
     * @param editor
     * @param output_message
     * @protected
     */
    protected insertIntoEditor(editor: Editor, output_message: string): void {
        const top_position = editor.offsetToPos(0);
        editor.replaceRange(output_message, top_position);
    }
}