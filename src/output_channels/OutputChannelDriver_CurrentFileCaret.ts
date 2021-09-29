import {OutputChannelDriver} from "./OutputChannelDriver";
import {getEditor} from "../Common";

export class OutputChannelDriver_CurrentFileCaret extends OutputChannelDriver {
    public readonly title = "Current file: caret position";

    public handle(output: string, is_error: boolean) {
        let editor = getEditor(this.app);
        if (null === editor) {
            // Probably the leaf is in preview mode or some other problem happened.
            // FIXME: Make it possible to use this feature also in preview mode.
            this.plugin.newError("You need to turn editing mode on, as I have not yet been programmed to insert shell command output text into a file in preview mode.");
            this.plugin.newError(output); // Good to output it at least some way.
            return;
        }

        // Do it
        editor.replaceSelection(output);
    }
}