import SC_Plugin from "../main";
import {
    Prompt,
    PromptConfiguration,
} from "../imports";

const prompts: {
    [key: string]: Prompt,
} = {};

export function getPromptById(prompt_id: string): Prompt {
    return prompts[prompt_id];
}

export function loadPrompts(plugin: SC_Plugin, prompt_configurations: PromptConfiguration[]) {
    prompt_configurations.forEach((prompt_configuration: PromptConfiguration) => {
        prompts[prompt_configuration.id] = new Prompt(plugin, prompt_configuration);
    });
}