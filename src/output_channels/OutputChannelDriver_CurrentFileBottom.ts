import {OutputChannelDriver_CurrentFile} from "./OutputChannelDriver_CurrentFile";
import {Editor, EditorPosition} from "obsidian";

export class OutputChannelDriver_CurrentFileBottom extends OutputChannelDriver_CurrentFile {
    protected readonly title = "Current file: bottom";

    /**
     * Inserts text into the given editor, at bottom.
     *
     * @param editor
     * @param output_message
     * @protected
     */
    protected insertIntoEditor(editor: Editor, output_message: string): void {
        const bottom_position: EditorPosition = {
            ch: editor.getLine(editor.lastLine()).length,   // The last character* of ...
            line: editor.lastLine(),                        // ... the last line.
        };                                                  // *) But do not subtract 1, because ch is zero-based, so when .length is used without -1, we are pointing AFTER the last character.
        editor.replaceRange(output_message, bottom_position);
    }
}