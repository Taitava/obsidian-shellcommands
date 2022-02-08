import {
    createPrompField,
    Preaction,
    PreactionConfiguration,
    PromptFieldConfiguration,
    PromptModal
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
        const fields_container_element = document.createElement("div");
        this.createFields(fields_container_element);
        const modal = new PromptModal(this.plugin, fields_container_element, this.shell_command_parsing_result);
        modal.open();
        return modal.promise;
    }

    private createFields(container_element: HTMLElement) {
        this.configuration.fields.forEach((field_configuration) => {
            createPrompField(container_element, field_configuration);
        });
    }

    protected getDefaultConfiguration(): Preaction_Prompt_Configuration {
        return {
            preaction_code: "prompt",
            enabled: false,
            fields: [],
        };
    }
}

export interface Preaction_Prompt_Configuration extends PreactionConfiguration {
    preaction_code: "prompt";
    fields: PromptFieldConfiguration[];
}