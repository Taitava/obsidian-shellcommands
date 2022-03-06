import SC_Plugin from "../../main";
import {
    IDGenerator,
    Prompt,
    PromptConfiguration,
} from "../../imports";

const prompts: Prompt[] = [];

const prompt_id_generator = new IDGenerator();

export function getPromptById(prompt_id: string): Prompt {
    for (const i in prompts) {
        const prompt = prompts[i];
        if (prompt_id === prompt.getID()) {
            return prompt;
        }
    }
    return null;
}

export function getPrompts() {
    return prompts;
}

export function loadPrompts(plugin: SC_Plugin, prompt_configurations: PromptConfiguration[]) {
    const prompt_ids: string[] = [];
    prompt_configurations.forEach((prompt_configuration: PromptConfiguration) => {
        prompts.push(new Prompt(plugin, prompt_configuration));
        prompt_ids.push(prompt_configuration.id);
    });

    // Store ids in an id generator so that newly generated ids will not collide with the existing ones.
    prompt_id_generator.setCurrentIDs(prompt_ids);
}

export function newPrompt(plugin: SC_Plugin): Prompt {

    // Setup a default configuration and generate an ID
    const prompt_configuration: PromptConfiguration = {
        id: prompt_id_generator.generateID(),
        title: "",
        preview_shell_command: false,
        fields: [],
    };

    // Instantiate a Prompt
    const prompt = new Prompt(plugin, prompt_configuration);
    prompts.push(prompt);

    // Store the configuration into plugin's settings
    plugin.settings.prompts.push(prompt_configuration);

    // Return the Prompt
    return prompt;
}