/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
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

import SC_Plugin from "../main";
import {ShellCommandParsingProcess, TShellCommand} from "../TShellCommand";
import {SC_Event} from "../events/SC_Event";
import {VariableSet} from "../variables/loadVariables";
import {
    Preaction_Prompt,
    Preaction_Prompt_Configuration,
} from "../imports";

export abstract class Preaction {

    protected constructor(
        protected readonly plugin: SC_Plugin,
        public readonly configuration: PreactionConfiguration,
        protected readonly t_shell_command: TShellCommand,
    ) {}

    /**
     * Returns a boolean indicating whether the pipeline of preactions can proceed to the next preaction. False indicates
     * to cancel running any possible later preactions, and also cancels execution of the shell command. If all preactions'
     * promises return true, the shell command will be executed.
     * @protected
     */
    protected abstract doPreaction(parsing_process: ShellCommandParsingProcess, sc_event: SC_Event | null): Promise<boolean>;

    /**
     * Maybe this wrapper method is unneeded, but have it for a while at least.
     */
    public perform(parsing_process: ShellCommandParsingProcess, sc_event: SC_Event | null): Promise<boolean> {
        return this.doPreaction(parsing_process, sc_event);
    }

    protected abstract getDefaultConfiguration(): PreactionConfiguration; // TODO: Remove if this won't be used.

    /**
     * Returns variables that are dependent of this Preaction, i.e. variables whose value is set by this Preaction.
     * If a variable is READ by a Preaction, it is NOT considered to be _dependent_ of the Preaction, as long as the variable's
     * value is not changed by the Preaction.
     *
     * By default, it returns an empty VariableSet, because not all Preactions will use variables at all.
     */
    public getDependentVariables(): VariableSet {
        return new VariableSet();
    }
}

export function createPreaction(plugin: SC_Plugin, preaction_configuration: PreactionConfiguration, t_shell_command: TShellCommand): Preaction {
    switch (preaction_configuration.type) {
        case "prompt":
            return new Preaction_Prompt(plugin, (preaction_configuration as Preaction_Prompt_Configuration), t_shell_command);
    }
}

export interface PreactionConfiguration {
    type: "prompt";
    enabled: boolean;
}