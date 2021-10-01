import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";


export class OutputChannelDriver_Notification extends OutputChannelDriver {
    /**
     * Not used because getTitle() exists, but must be present.
     * @protected
     */
    protected readonly title: string;

    public getTitle(output_stream: OutputStream): string {
        switch (output_stream) {
            case "stdout":
                return "Notification balloon";
            case "stderr":
                return "Error balloon";
        }
    }

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
                    this.plugin.newNotification(output_message);
                    break;
                case "stderr":
                    // Error output
                    this.plugin.newError("[" + error_code + "]: " + output_message);
                    break;
            }
        }
    }
}