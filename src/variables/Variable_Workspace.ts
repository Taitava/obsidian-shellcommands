import {Variable} from "./Variable";

export class Variable_Workspace extends Variable{
    public variable_name = "workspace";
    public help_text = "Gives the current workspace's name.";

    protected always_available = false;

    protected generateValue(): string {

        // Idea how to access the workspaces plugin is copied 2021-09-15 from https://github.com/Vinzent03/obsidian-advanced-uri/blob/f7ef80d5252481242e69496208e925874209f4aa/main.ts#L168-L179
        // @ts-ignore internalPlugins exists although it's not in obsidian.d.ts.
        const workspaces_plugin = this.app.internalPlugins?.plugins?.workspaces;
        if (!workspaces_plugin) {
            this.newErrorMessage("Workspaces core plugin is not found for some reason. Please raise an issue in GitHub.")
            return null;
        }
        else if (!workspaces_plugin.enabled) {
            this.newErrorMessage("Workspaces core plugin is not enabled.")
            return null;
        }

        const workspace_name = workspaces_plugin.instance?.activeWorkspace;
        if (!workspace_name) {
            this.newErrorMessage("Could not figure out the current workspace's name. Probably you have not loaded a workspace. You can do it e.g. via \"Manage workspaces\" from the left side panel.")
            return null;
        }

        // All ok
        return workspace_name;
    }

    public isAvailable(): boolean {
        // @ts-ignore internalPlugins exists, although it's not in obsidian.d.ts.
        const workspaces_plugin = this.app.internalPlugins?.plugins?.workspaces;
        return workspaces_plugin && workspaces_plugin.enabled && workspaces_plugin.instance?.activeWorkspace;
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when the Workspaces core plugin is enabled.";
    }
}