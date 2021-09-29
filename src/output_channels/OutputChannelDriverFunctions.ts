import {ShellCommandConfiguration} from "../settings/ShellCommandConfiguration";
import ShellCommandsPlugin from "../main";
import {OutputChannelDriver_Notification} from "./OutputChannelDriver_Notification";
import {OutputChannelDriver} from "./OutputChannelDriver";
import {OutputChannelDriver_CurrentFileCaret} from "./OutputChannelDriver_CurrentFileCaret";

let output_channel_drivers:{
    [key: string]: OutputChannelDriver;
} = {};

// Register output channel drivers
registerOutputChannelDriver("notification", new OutputChannelDriver_Notification());
registerOutputChannelDriver("current-file-caret", new OutputChannelDriver_CurrentFileCaret());

export function handleShellCommandOutput(plugin: ShellCommandsPlugin, shell_command_configuration: ShellCommandConfiguration, stdout: string, stderr: string) {
    if ("ignore" == shell_command_configuration.stdout_channel) {
        // The output should be discarded.
        return;
    }

    // TODO: Handle stderr too! And maybe add an option to combine stderr to stdout.

    // Check that an output driver exists
    if (undefined === output_channel_drivers[shell_command_configuration.stdout_channel]) {
        throw new Error("No output driver found for channel '" + shell_command_configuration.stdout_channel + "'.");
    }
    let driver: OutputChannelDriver = output_channel_drivers[shell_command_configuration.stdout_channel];

    // Perform handling the output
    driver.initialize(plugin);
    driver.handle(stdout, false); // TODO: Implement stderr too.
}

export function getOutputChannelDriversOptionList() {
    let list: {
        [key: string]: string;
    } = {ignore: "Ignore"};
    for (let name in output_channel_drivers) {
        list[name] = output_channel_drivers[name].title;
    }
    console.log(list);
    return list;
}

function registerOutputChannelDriver(name: string, driver: OutputChannelDriver) {
    if (undefined !== output_channel_drivers[name]) {
        throw new Error("OutputChannelDriver named '" + name + "' is already registered!");
    }
    output_channel_drivers[name] = driver;
}