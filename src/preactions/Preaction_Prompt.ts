import {
    getPromptById,
    Preaction,
    PreactionConfiguration,
    Prompt,
} from "../imports";
import SC_Plugin from "../main";
import {ParsingResult} from "../TShellCommand";

export class Preaction_Prompt extends Preaction {

    constructor(
        plugin: SC_Plugin,
        protected readonly configuration: Preaction_Prompt_Configuration,
        shell_command_parsing_result: ParsingResult,
    ) {
        super(plugin, configuration,shell_command_parsing_result);
    }

    protected doPreaction(): Promise<void> {
        return this.getPrompt().openPrompt();
    }

    protected getDefaultConfiguration(): Preaction_Prompt_Configuration {
        return {
            preaction_code: "prompt",
            enabled: false,
            prompt_id: "",
        };
    }

    private getPrompt(): Prompt {
        return getPromptById(this.configuration.prompt_id);
    }
}

export interface Preaction_Prompt_Configuration extends PreactionConfiguration {
    preaction_code: "prompt";
    prompt_id: string;
}