import {
    getPromptById,
    Preaction,
    PreactionConfiguration,
    Prompt,
} from "../imports";
import SC_Plugin from "../main";
import {TShellCommand} from "../TShellCommand";

export class Preaction_Prompt extends Preaction {

    constructor(
        plugin: SC_Plugin,
        protected readonly configuration: Preaction_Prompt_Configuration,
        t_shell_command: TShellCommand,
    ) {
        super(plugin, configuration, t_shell_command);
    }

    protected doPreaction(): Promise<void> {
        return this.getPrompt().openPrompt(this.t_shell_command);
    }

    protected getDefaultConfiguration(): Preaction_Prompt_Configuration {
        return {
            type: "prompt",
            enabled: false,
            prompt_id: "",
        };
    }

    private getPrompt(): Prompt {
        return getPromptById(this.configuration.prompt_id);
    }
}

export interface Preaction_Prompt_Configuration extends PreactionConfiguration {
    type: "prompt";
    prompt_id: string;
}