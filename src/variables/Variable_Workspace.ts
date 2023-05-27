/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {Variable} from "./Variable";

export class Variable_Workspace extends Variable{
    public variable_name = "workspace";
    public help_text = "Gives the current workspace's name.";

    protected always_available = false;

    protected async generateValue(): Promise<string> {
        // Idea how to access the workspaces plugin is copied 2021-09-15 from https://github.com/Vinzent03/obsidian-advanced-uri/blob/f7ef80d5252481242e69496208e925874209f4aa/main.ts#L168-L179
        // @ts-ignore internalPlugins exists, although it's not in obsidian.d.ts. PRIVATE API
        const workspaces_plugin = this.app.internalPlugins?.plugins?.workspaces;
        if (!workspaces_plugin) {
            this.throw("Workspaces core plugin is not found for some reason. Please create a discussion in GitHub.");
        } else if (!workspaces_plugin.enabled) {
            this.throw("Workspaces core plugin is not enabled.");
        }

        const workspace_name = workspaces_plugin.instance?.activeWorkspace;
        if (!workspace_name) {
            this.throw("Could not figure out the current workspace's name. Probably you have not loaded a workspace. You can do it e.g. via \"Manage workspaces\" from the left side panel.");
        }

        // All ok
        return workspace_name;
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> when the Workspaces core plugin is enabled.";
    }
}