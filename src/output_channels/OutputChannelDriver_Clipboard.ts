import {OutputChannelDriver} from "./OutputChannelDriver";
import {joinObjectProperties} from "../Common";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {EOL} from "os";

export class OutputChannelDriver_Clipboard extends OutputChannelDriver {
    protected readonly title = "Clipboard";

    public handle(output: OutputStreams) {
        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, they
        // will be joined together with " " as a separator.
        let output_message = joinObjectProperties(output, " ");

        const clipboard = require("electron").clipboard;
        clipboard.writeText(output_message);

        // Notify the user so they know a) what was copied to clipboard, and b) that their command has finished execution.
        this.plugin.newNotification("Copied to clipboard: " + EOL + output_message);
    }
}