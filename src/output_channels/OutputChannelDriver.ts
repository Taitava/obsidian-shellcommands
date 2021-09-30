import ShellCommandsPlugin from "../main";
import {App} from "obsidian";
import {OutputStreams} from "./OutputChannelDriverFunctions";
import {OutputStream} from "./OutputChannel";

export abstract class OutputChannelDriver {
    /**
     * Human readable name, used in settings.
     */
    public abstract title: string;

    protected plugin: ShellCommandsPlugin;
    protected app: App;

    public initialize(plugin: ShellCommandsPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    public abstract handle(output: OutputStreams, error_code: number|null): void;
}