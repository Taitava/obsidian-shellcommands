import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";


export class OutputChannelDriver_Notification extends OutputChannelDriver {
    public readonly title = "Notification";

    public handle(output: OutputStreams, error_code: number|null) {

        // Iterate output streams.
        // There can be both "stdout" and "stderr" present at the same time, or just one of them. If both are present, two
        // notifications will be created.
        let output_stream_name: OutputStream;
        for (output_stream_name in output) {
            let output_message = output[output_stream_name];
            switch (output_stream_name) {
                case "stdout":
                    // Normal output
                    this.plugin.newNotice(output_message);
                    break;
                case "stderr":
                    // Error output
                    this.plugin.newError("[" + error_code + "]: " + output_message);
                    break;
            }
        }
    }
}