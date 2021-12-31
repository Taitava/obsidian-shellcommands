import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Workspace extends ShellCommandVariable{
    static variable_name = "workspace";
    static help_text = "Gives the current workspace's name, if the Workspaces core plugin is enabled.";

    generateValue(): string {

        // Idea how to access the workspaces plugin is copied 2021-09-15 from https://github.com/Vinzent03/obsidian-advanced-uri/blob/f7ef80d5252481242e69496208e925874209f4aa/main.ts#L168-L179
        // @ts-ignore internalPlugins exists although it's not in obsidian.d.ts.
        let workspaces_plugin = this.app.internalPlugins?.plugins?.workspaces;
        if (!workspaces_plugin) {
            this.newErrorMessage("Workspaces core plugin is not found for some reason. Please raise an issue in GitHub.")
            return null;
        }
        else if (!workspaces_plugin.enabled) {
            this.newErrorMessage("Workspaces core plugin is not enabled.")
            return null;
        }

        let workspace_name = workspaces_plugin.instance?.activeWorkspace;
        if (!workspace_name) {
            this.newErrorMessage("Could not figure out the current workspace's name. Probably you have not loaded a workspace. You can do it e.g. via \"Manage workspaces\" from the left side panel.")
            return null;
        }

        // All ok
        return workspace_name;
    }
}