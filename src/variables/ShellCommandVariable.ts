import {App} from "obsidian";
import ShellCommandsPlugin from "../main";

export abstract class ShellCommandVariable {
    readonly plugin: ShellCommandsPlugin;
    readonly app: App;
    readonly enable_error_messages: boolean;
    readonly name: string;
    readonly has_argument: boolean = false;

    constructor(plugin: ShellCommandsPlugin, enable_error_messages: boolean) {
        this.plugin = plugin
        this.app = plugin.app;
        this.enable_error_messages = enable_error_messages;
    }

    abstract getValue(argument: string): string|null;

    getPattern() {
        let pattern = '\{\{' + this.name;
        if (this.has_argument) {
            pattern += ':(.+?)';
        }
        pattern += '\}\}';
        return pattern;
    }

    protected newError(message: string) {
        // Notifications can be disabled. This is done when previewing commands while they are being typed.
        if (this.enable_error_messages) {
            let prefix = "{{" + this.name + "}}: ";
            this.plugin.newError(prefix + message);
        }
    }
}
