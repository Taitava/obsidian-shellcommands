import {App} from "obsidian";
import ShellCommandsPlugin from "../main";

export abstract class ShellCommandVariable {
    readonly plugin: ShellCommandsPlugin;
    readonly app: App;
    private error_messages: string[] = [];
    readonly name: string;
    readonly has_argument: boolean = false;

    constructor(plugin: ShellCommandsPlugin) {
        this.plugin = plugin
        this.app = plugin.app;
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

    /**
     * Note that error messages can only exist after getValue() is called!
     */
    getErrorMessages() {
        return this.error_messages;
    }

    protected newErrorMessage(message: string) {
        let prefix = "{{" + this.name + "}}: ";
        this.error_messages.push(prefix + message);
    }
}
