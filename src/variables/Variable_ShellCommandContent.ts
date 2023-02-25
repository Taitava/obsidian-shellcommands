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
import SC_Plugin from "../main";

export class Variable_ShellCommandContent extends Variable {
    public variable_name = "shell_command_content";
    public help_text = "Gives the executable shell command statements that should be passed to a shell.";

    constructor(
        plugin: SC_Plugin,
        private shellCommandContent: string,
    ) {
        super(plugin);
    }

    /**
     * TODO: Remove this method. Do not use this variable with parseVariables(), use parseVariableSynchronously() instead.
     * @protected
     */
    protected async generateValue(): Promise<string> {
        return this.shellCommandContent;
    }

    protected generateValueSynchronously() {
        return this.shellCommandContent;
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in  <em>custom shells'</em> settings: for defining shell arguments, or a shell command wrapper.";
    }
}