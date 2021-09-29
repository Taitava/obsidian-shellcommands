import {OutputChannelDriver} from "./OutputChannelDriver";


export class OutputChannelDriver_Notification extends OutputChannelDriver {
    public readonly title = "Notification";

    public handle(output: string, is_error: boolean) {
        if (is_error) {
            this.plugin.newError(output);
        } else {
            this.plugin.newNotice(output);
        }
    }
}