/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            // Idea how to access the workspaces plugin is copied 2021-09-15 from https://github.com/Vinzent03/obsidian-advanced-uri/blob/f7ef80d5252481242e69496208e925874209f4aa/main.ts#L168-L179
            // @ts-ignore internalPlugins exists although it's not in obsidian.d.ts.
            const workspaces_plugin = this.app.internalPlugins?.plugins?.workspaces;
            if (!workspaces_plugin) {
                this.newErrorMessage("Workspaces core plugin is not found for some reason. Please create a discussion in GitHub.")
                return resolve(null);
            } else if (!workspaces_plugin.enabled) {
                this.newErrorMessage("Workspaces core plugin is not enabled.")
                return resolve(null);
            }

            const workspace_name = workspaces_plugin.instance?.activeWorkspace;
            if (!workspace_name) {
                this.newErrorMessage("Could not figure out the current workspace's name. Probably you have not loaded a workspace. You can do it e.g. via \"Manage workspaces\" from the left side panel.")
                return resolve(null);
            }

            // All ok
            return resolve(workspace_name);
        });
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