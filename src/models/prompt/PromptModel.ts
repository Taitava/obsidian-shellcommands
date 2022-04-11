import {
    getIDGenerator,
    Model,
    ParentModelOneToManyIdRelation,
    Preaction_Prompt_Configuration,
    Prompt,
    PromptConfiguration,
    PromptSettingsModal,
} from "../../imports";
import {Setting} from "obsidian";
import {SC_MainSettings} from "../../settings/SC_MainSettings";

export class PromptModel extends Model {

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
            .addExtraButton(button => button
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
            id: getIDGenerator().generateID(),
            title: "",
            description: "",
            preview_shell_command: false,
            fields: [],
            execute_button_text: "Execute",
        };
    }

    protected _deleteInstance(prompt: Prompt): void {

        // Remove the Prompt from all TShellCommands that use it.
        const shell_commands = this.plugin.getTShellCommands();
        for (const shell_command_id in shell_commands) {
            const t_shell_command = shell_commands[shell_command_id];
            for (const preaction_configuration of t_shell_command.getConfiguration().preactions) {
                if ("prompt" === preaction_configuration.type) {
                    const preaction_prompt_configuration = preaction_configuration as Preaction_Prompt_Configuration;
                    if (prompt.getID() === preaction_prompt_configuration.prompt_id) {
                        // This TShellCommand uses this Prompt.
                        // Remove the Prompt from use.
                        preaction_prompt_configuration.enabled = false;
                        preaction_prompt_configuration.prompt_id = undefined;
                        t_shell_command.resetPreactions();
                        // Saving is done later, after the _deleteInstance() call.
                    }
                }
            }
        }

        this.prompts.delete(prompt.getID());
    }
}

export class PromptMap extends Map<string, Prompt> {}