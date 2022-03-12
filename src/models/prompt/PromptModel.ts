import {
    IDGenerator,
    Model,
    ParentModelOneToManyIdRelation,
    Prompt,
    PromptConfiguration,
    PromptSettingsModal,
} from "../../imports";
import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";

export class PromptModel extends Model {

    public readonly id_generator = new IDGenerator();
    private prompts = new PromptMap();

    public getSingularName(): string {
        return "Prompt";
    }

    protected defineParentConfigurationRelation(prompt: Prompt): ParentModelOneToManyIdRelation {
        return {
            type: "one-to-many-id",
            key: "prompts",
            id: prompt.getID(),
        };
    }

    public loadInstances(parent_configuration: SC_MainSettings): PromptMap {
        this.prompts = new PromptMap();
        parent_configuration.prompts.forEach((prompt_configuration: PromptConfiguration) => {
            const prompt: Prompt = new Prompt(this, this.plugin, prompt_configuration, parent_configuration);
            this.prompts.set(prompt_configuration.id, prompt);
        });
        return this.prompts;
    }

    public newInstance(parent_configuration: SC_MainSettings): Prompt {
        // TODO: Move this logic to the base Model class.

        // Setup a default configuration and generate an ID
        const prompt_configuration = this._getDefaultConfiguration();

        // Instantiate a Prompt
        const prompt = new Prompt(this, this.plugin, prompt_configuration, this.plugin.settings);
        this.prompts.set(prompt.getID(), prompt);

        // Store the configuration into plugin's settings
        this.plugin.settings.prompts.push(prompt_configuration);

        // Return the Prompt
        return prompt;

    }

    protected _createSettingFields(prompt: Prompt, container_element: HTMLElement): Setting {
        const prompt_name_setting = new Setting(container_element)
            // Configuration button
            .setName(prompt.getTitle())
            .addExtraButton(button => button // TODO: Change to cog icon.
                .setTooltip("Define prompt fields")
                .setIcon("gear")
                .onClick(() => {
                    this.openSettingsModal(prompt, prompt_name_setting);
                }),
            )
        ;
        return prompt_name_setting;
    }

    public validateValue(prompt: Prompt, field: string, value: unknown): Promise<void> {
        // This method is not used, so it can just resolve all the time.
        return Promise.resolve(undefined);
    }

    public openSettingsModal(prompt: Prompt, prompt_name_setting: Setting) {
        const modal = new PromptSettingsModal(this.plugin, prompt, prompt_name_setting);
        modal.open();
    }

    private _getDefaultConfiguration(): PromptConfiguration {
        return {
            id: this.id_generator.generateID(),
            title: "",
            description: "",
            preview_shell_command: false,
            fields: [],
            execute_button_text: "Execute",
        };
    }

    protected _deleteInstance(prompt: Prompt): void {
        this.prompts.delete(prompt.getID());
    }
}

export class PromptMap extends Map<string, Prompt> {}