import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {joinObjectProperties} from "../Common";
import {EOL} from "os";

export class OutputChannelDriver_StatusBar extends OutputChannelDriver {
    protected readonly title = "Status bar";
    protected accepts_empty_output = true;

    private status_bar_element: HTMLElement;

    public _handle(output: OutputStreams) {
        const status_bar_element = this.getStatusBarElement();

        // Combine stdout and stderr (in case both of them happen to be present).
        const stdout_and_stderr = joinObjectProperties(output, EOL + EOL).trim(); // Will be an empty string if 'output' is an empty object (i.e. no 'stdout' nor 'stderr').

        // Full output (shown when hovering with mouse)
        status_bar_element.setAttr("aria-label", stdout_and_stderr);

        // Show last line permanently.
        const output_message_lines = stdout_and_stderr.split(/(\r\n|\r|\n)/u);
        const last_output_line = output_message_lines[output_message_lines.length - 1];
        status_bar_element.setText(last_output_line);
    }

    private getStatusBarElement() {
        if (!this.status_bar_element) {
            this.status_bar_element = this.plugin.addStatusBarItem();
        }
        return this.status_bar_element;
    }
}