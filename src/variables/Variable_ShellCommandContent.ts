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

    protected always_available = true; // Make the variable not shown in default value settings. The default of this property is already true, but enforce this in case the default is some day changed to false.

    constructor(
        plugin: SC_Plugin,
        private shellCommandContent: string,
    ) {
        super(plugin);
    }

    protected async generateValue(): Promise<string> {
        throw new Error(this.constructor.name + ".generateValue() must not be called. Call .generateValueSynchronously() instead. I.e. use parseVariableSynchronously(), not parseVariables().");
        // TODO: Make it possible not to define generateValue() in subclasses of Variable. Move the above exception throwing to happen in Variable.getValue() and add some mechanism for Variable subclasses to define which method they support.
    }

    protected generateValueSynchronously() {
        return this.shellCommandContent;
    }

    public getAvailabilityText(): string {
        return "<strong>Only available</strong> in  <em>custom shells'</em> settings: for defining shell arguments, or a shell command wrapper.";
    }
}