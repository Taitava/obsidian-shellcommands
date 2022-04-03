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

    protected doPreaction(parsing_process: ShellCommandParsingProcess, sc_event: SC_Event): Promise<void> {
        return this.getPrompt().openPrompt(this.t_shell_command, parsing_process, sc_event);
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
        return this.plugin.getPrompts().get(this.configuration.prompt_id);
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
    prompt_id: string;
}