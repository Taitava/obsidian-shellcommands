/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

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
import {debugLog} from "../../Debug";

export class PromptModel extends Model {

    private prompts = new PromptMap();

    public static getSingularName(): string {
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
        debugLog("Loading Prompt instances.");
        this.prompts = new PromptMap();
        parent_configuration.prompts.forEach((prompt_configuration: PromptConfiguration) => {
            const prompt: Prompt = new Prompt(this, this.plugin, prompt_configuration, parent_configuration);
            this.prompts.set(prompt_configuration.id, prompt);
        });
        return this.prompts;
    }

    public newInstance(parent_configuration: SC_MainSettings): Prompt {
        debugLog("Creating a new Prompt instance.");
        // TODO: Move this logic to the base Model class.

        // Setup a default configuration and generate an ID
        const prompt_configuration = this.getDefaultConfiguration();

        // Instantiate a Prompt
        const prompt = new Prompt(this, this.plugin, prompt_configuration, this.plugin.settings);
        this.prompts.set(prompt.getID(), prompt);

        // Store the configuration into plugin's settings
        this.plugin.settings.prompts.push(prompt_configuration);

        // Return the Prompt
        return prompt;

    }

    protected _createSettingFields(prompt: Prompt, container_element: HTMLElement): Setting {
        debugLog("Creating setting fields for a Prompt instance.");
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
        // TODO: Add Prompt description here. Make sure it supports multiline, take a look at CustomShellModel._createSettingFields().
        return prompt_name_setting;
    }

    public validateValue(prompt: Prompt, field: string, value: unknown): Promise<void> {
        // This method is not used, so it can just resolve all the time.
        return Promise.resolve(undefined);
    }

    public openSettingsModal(prompt: Prompt, prompt_name_setting: Setting) {
        debugLog("Opening settings modal for a Prompt instance.");
        const modal = new PromptSettingsModal(this.plugin, prompt, prompt_name_setting);
        modal.open();
    }

    public getDefaultConfiguration(): PromptConfiguration {
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
        debugLog("Deleting a Prompt instance.");

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