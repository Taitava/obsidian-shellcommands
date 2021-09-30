import ShellCommandsPlugin from "../main";
import {App} from "obsidian";
import {ExecException} from "child_process";

export abstract class OutputChannelDriver {
    /**
     * Human readable name, used in settings.
     */
    public abstract title: string;

    /**
     * If true, can handle outputs that are empty strings "".
     * If false, won't be called at all if output happens to be empty.
     */
    public abstract handles_empty_output: boolean;

    protected plugin: ShellCommandsPlugin;
    protected app: App;

    public initialize(plugin: ShellCommandsPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    public abstract handle(output: string, error: ExecException|null): void;
}