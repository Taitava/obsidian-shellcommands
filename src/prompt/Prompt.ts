import SC_Plugin from "../main";
import {ParsingResult} from "../TShellCommand";
import {
    createPrompField,
    PromptField,
    PromptFieldConfiguration,
    PromptModal,
    PromptSettingsModal,
} from "../imports";

export class Prompt {

    private prompt_fields: PromptField[] = [];

    constructor(
        private plugin: SC_Plugin,
        private configuration: PromptConfiguration,
    ) {}

    public getID() {
        return this.configuration.id;
    }

    public getTitle() {
        return this.configuration.title;
    }

    public getConfiguration() {
        return this.configuration;
    }

    public openPrompt(): Promise<void> {
        const fields_container_element = document.createElement("div");
        this.createFields(fields_container_element);
        const modal = new PromptModal(
            this.plugin,
            fields_container_element,
            {shell_command: "Shell command", alias: "Alias"} as ParsingResult, // TODO: Remove the parsing result completely from the prompt. Show unparsed shell command in the prompt instead.
            () => {return this.validateFields();}
        );
        modal.open();
        return modal.promise;
    }

    public openSettingsModal() {
        const modal = new PromptSettingsModal(this.plugin, this);
        modal.open();
    }

    private createFields(container_element: HTMLElement) {
        this.prompt_fields = [];
        this.configuration.fields.forEach((field_configuration: PromptFieldConfiguration) => {
            this.prompt_fields.push(
                createPrompField(container_element, field_configuration)
            );
        });
    }

    private validateFields() {
        let valid = true;
        this.prompt_fields.forEach((prompt_field: PromptField) => {
            if (!prompt_field.validate()) {
                valid = false;
            }
        });
        return valid;
    }

}

export interface PromptConfiguration {
    id: string;
    title: string;
    fields: PromptFieldConfiguration[];
}