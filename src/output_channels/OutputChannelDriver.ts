import ShellCommandsPlugin from "../main";
import {App} from "obsidian";

export abstract class OutputChannelDriver {
    /**
     * Human readable name, used in settings.
     */
    public readonly title: string;

    protected plugin: ShellCommandsPlugin;
    protected app: App;

    public initialize(plugin: ShellCommandsPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    public abstract handle(output: string, is_error: boolean): void;
}