import {OutputChannelDriver} from "./OutputChannelDriver";
import {getEditor, getView, joinObjectProperties} from "../Common";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {Editor} from "obsidian";
import {debugLog} from "../Debug";

export abstract class OutputChannelDriver_CurrentFile extends OutputChannelDriver {

    protected _handle(output: OutputStreams) {
        let editor = getEditor(this.app);
        let view = getView(this.app);

        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, they
        // will be joined together with " " as a separator.
        let output_message = joinObjectProperties(output, " ");

        if (null === editor) {
            // For some reason it's not possible to get an editor.
            this.plugin.newError("Could not get an editor instance! Please raise an issue in GitHub. The command output is in the next error box:");
            this.plugin.newError(output_message); // Good to output it at least some way.
            debugLog("OutputChannelDriver_CurrentFile: Could not get an editor instance.")
            return;
        }

        // Check if the view is in source mode
        if (null === view) {
            // For some reason it's not possible to get an editor, but it's not a big problem.
            debugLog("OutputChannelDriver_CurrentFile: Could not get a view instance.");
        } else {
            // We do have a view
            if ("source" !== view.getMode()) {
                // Warn that the output might go to an unexpected place in the note file.
                this.plugin.newNotification("Note that your active note is not in 'Edit' mode! The output comes visible when you switch to 'Edit' mode again!");
            }
        }

        // Insert into the current file
        this.insertIntoEditor(editor, output_message);
    }

    protected abstract insertIntoEditor(editor: Editor, output_message: string): void;
}