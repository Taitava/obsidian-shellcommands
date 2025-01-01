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

import {SC_Event} from "../events/SC_Event";
import {VariableSet} from "../variables/loadVariables";
import {
    Preaction,
    PreactionConfiguration,
    Prompt,
} from "../imports";
import SC_Plugin from "../main";
import {ShellCommandParsingProcess, TShellCommand} from "../TShellCommand";

export class Preaction_Prompt extends Preaction {

    constructor(
        plugin: SC_Plugin,
        public readonly configuration: Preaction_Prompt_Configuration,
        t_shell_command: TShellCommand,
    ) {
        super(plugin, configuration, t_shell_command);
    }

    protected doPreaction(parsing_process: ShellCommandParsingProcess, sc_event: SC_Event): Promise<boolean> {
        // TODO: Now that doPreaction() returns a similar Promise as is received from openPrompt(), consider just returning the same Promise instead of creating a new one.
        return new Promise<boolean>((resolve) => {
            this.getPrompt().openPrompt(this.t_shell_command, parsing_process, sc_event).then((execution_confirmed: boolean) => {
                // The PromptModal has been closed.
                // Check if user wanted to execute the shell command or cancel.
                if (execution_confirmed) {
                    // User wants to execute.
                    resolve(true);
                } else {
                    // User wants to cancel.
                    resolve(false);
                }
            });
        });
    }

    /**
     * Returns all the CustomVariables whose values this Preaction's Prompt sets.
     */
    public getDependentVariables(): VariableSet {
        const variables = new VariableSet();
        for (const prompt_field of this.getPrompt().prompt_fields) {
            // Check that the PromptField has a target variable defined. Otherwise getTargetVariable() would cause a crash.
            if ("" !== prompt_field.configuration.target_variable_id) {
                variables.add(prompt_field.getTargetVariable());
            }
        }
        return variables;
    }

    /**
     * TODO: Remove.
     */
    protected getDefaultConfiguration(): Preaction_Prompt_Configuration {
        return {
            type: "prompt",
            enabled: false,
            prompt_id: "",
        };
    }

    private getPrompt(): Prompt {
        const promptId: string | undefined = this.configuration.prompt_id;
        if (undefined === promptId) {
            throw new Error("Prompt id is undefined in configuration.");
        }
        const prompt: Prompt | undefined = this.plugin.getPrompts().get(promptId);
        if (undefined === prompt) {
            throw new Error("Prompt with id '" + promptId + "' does not exist");
        }
        return prompt;
    }
}

export function getDefaultPreaction_Prompt_Configuration(): Preaction_Prompt_Configuration {
    return {
        type: "prompt",
        enabled: false,
        prompt_id: "",
    };
}

export interface Preaction_Prompt_Configuration extends PreactionConfiguration {
    type: "prompt";
    prompt_id: string | undefined;
}