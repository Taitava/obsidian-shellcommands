import {
    IDGenerator,
    Model,
    ParentModelOneToManyRelation,
    Prompt,
    PromptConfiguration,
    PromptSettingsModal,
} from "../../imports";
import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";

export class PromptModel extends Model {

    public readonly id_generator = new IDGenerator();

    public getSingularName(): string {
        return "Prompt";
    }

    protected defineParentConfigurationRelation(prompt: Prompt): ParentModelOneToManyRelation {
        return {
            type: "one-to-many",
            key: "prompts",
            index: prompt.prompt_index as number, // TODO: Change the relation so that instead of defining 'index', would be defined an 'id'. But needs to take into account that PromptField uses an ID-less relation.
        };
    }

    public createInstances(parent_configuration: SC_MainSettings): PromptMap {
        const prompts = new PromptMap();
        parent_configuration.prompts.forEach((prompt_configuration: PromptConfiguration, prompt_index: number) => {
            const prompt: Prompt = new Prompt(this, this.plugin, prompt_configuration, parent_configuration, prompt_index);
            prompts.set(prompt_configuration.id, prompt);
        });
        return prompts;
    }

    public newInstance(parent_configuration: SC_MainSettings): Prompt {
        // TODO: Move this logic to the base Model class.

        // Setup a default configuration and generate an ID
        const prompt_configuration = this._getDefaultConfiguration();

        // Instantiate a Prompt
        const prompt = new Prompt(this, this.plugin, prompt_configuration, this.plugin.settings, parent_configuration.prompts.length);

        // Store the configuration into plugin's settings
        this.plugin.settings.prompts.push(prompt_configuration);

        // Return the Prompt
        return prompt;

    }

    protected _createSettingFields(prompt: Prompt, container_element: HTMLElement): Setting {
        const setting = new Setting(container_element)
            // Configuration button
            .setName(prompt.getTitle())
            .addButton(button => button
                .setButtonText("Configure")
                .onClick(() => {
                    this.openSettingsModal(prompt);
                }),
            )
        ;
        return setting;
    }

    public openSettingsModal(prompt: Prompt) {
        const modal = new PromptSettingsModal(this.plugin, prompt);
        modal.open();
    }

    private _getDefaultConfiguration(): PromptConfiguration {
        return {
            id: this.id_generator.generateID(),
            title: "",
            preview_shell_command: false,
            fields: [],
        };
    }
}

export class PromptMap extends Map<string, Prompt> {}