import {SC_Event} from "../events/SC_Event";
import {
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
        protected readonly sc_event: SC_Event | null,
    ) {
        super(plugin, configuration, t_shell_command, sc_event);
    }

    protected doPreaction(): Promise<void> {
        return this.getPrompt().openPrompt(this.t_shell_command, this.sc_event);
    }

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

export interface Preaction_Prompt_Configuration extends PreactionConfiguration {
    type: "prompt";
    prompt_id: string;
}