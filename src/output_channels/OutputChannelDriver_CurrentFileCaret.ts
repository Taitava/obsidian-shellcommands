import {OutputChannelDriver} from "./OutputChannelDriver";
import {getEditor, joinObjectProperties} from "../Common";
import {OutputStreams} from "./OutputChannelDriverFunctions";

export class OutputChannelDriver_CurrentFileCaret extends OutputChannelDriver {
    protected readonly title = "Current file: caret position";

    public handle(output: OutputStreams) {
        let editor = getEditor(this.app);

        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, they
        // will be joined together with " " as a separator.
        let output_message = joinObjectProperties(output, " ");

        if (null === editor) {
            // Probably the leaf is in preview mode or some other problem happened.
            // FIXME: Make it possible to use this feature also in preview mode.
            this.plugin.newError("You need to turn editing mode on, as I have not yet been programmed to insert shell command output text into a file in preview mode.");
            this.plugin.newError(output_message); // Good to output it at least some way.
            return;
        }

        // Insert into the current file
        editor.replaceSelection(output_message);
    }
}