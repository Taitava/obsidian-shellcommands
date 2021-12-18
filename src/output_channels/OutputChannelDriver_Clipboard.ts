import {OutputChannelDriver} from "./OutputChannelDriver";
import {joinObjectProperties} from "../Common";
import {OutputStreams} from "./OutputChannelDriverFunctions";
// @ts-ignore "electron" is installed.
import {clipboard} from "electron";
import {EOL} from "os";

export class OutputChannelDriver_Clipboard extends OutputChannelDriver {
    protected readonly title = "Clipboard";

    protected _handle(output: OutputStreams) {
        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, they
        // will be joined together with " " as a separator.
        let output_message = joinObjectProperties(output, " ");
        clipboard.writeText(output_message);

        if (this.plugin.settings.output_channel_clipboard_also_outputs_to_notification) {
            // Notify the user so they know a) what was copied to clipboard, and b) that their command has finished execution.
            this.plugin.newNotification("Copied to clipboard: " + EOL + output_message + EOL + EOL + "(Notification can be turned off in settings.)");
        }
    }
}