import {OutputChannelDriver} from "./OutputChannelDriver";
import {ExecException} from "child_process";


export class OutputChannelDriver_Notification extends OutputChannelDriver {
    public readonly title = "Notification";

    handles_empty_output = false;

    public handle(output: string, error: ExecException|null) {
        if (null !== error) {
            // Usually, error.message contains something like: "Command failed: command-name and parameters " + stderr.
            // But I'm not sure if stderr is always included in error.message or not, so I want to include both error.message
            // and stderr in the message. I just don't want stderr to be accidentally duplicated in the message, so I'll first
            // remove stderr from error.message. And stderr == output here in this case.
            let error_message = error.message.replace(output, "") + " " + output;
            this.plugin.newError("[" + error.code + "]: " + error_message);
        } else {
            this.plugin.newNotice(output);
        }
    }
}