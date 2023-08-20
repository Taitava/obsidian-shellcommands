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

import SC_Plugin from "../../main";
import {ShellCommandParsingProcess, TShellCommand} from "../../TShellCommand";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {SC_Event} from "../../events/SC_Event";
import {
    getModel,
    Instance,
    PromptField,
    PromptFieldConfiguration,
    PromptFieldSet,
    PromptFieldModel,
    PromptModal,
    PromptModel,
    getIDGenerator,
    Preaction_Prompt_Configuration,
    UsageContainer,
} from "../../imports";
import {debugLog} from "../../Debug";
import {VariableMap} from "../../variables/loadVariables";
import {getUsedVariables} from "../../variables/parseVariables";

export class Prompt extends Instance {

    public prompt_fields: PromptFieldSet = new PromptFieldSet();

    constructor(
        public model: PromptModel,
        protected plugin: SC_Plugin,
        public configuration: PromptConfiguration,
        public parent_configuration: SC_MainSettings,
    ) {
        super(model, configuration, parent_configuration);

        // Introduce the ID to an ID generator so that it won't accidentally generate the same ID again when creating new Prompts.
        getIDGenerator().addReservedID(configuration.id);

        this.createFields();
    }


    public getID() {
        return this.configuration.id;
    }

    public getTitle() {
        return this.configuration.title;
    }

    public getConfiguration() {
        return this.configuration;
    }

    public getCSSClass(): string {
        return Prompt.getCSSBaseClass() + "-" + this.getID();
    }

    public static getCSSBaseClass() {
        return "SC-prompt-modal";
    }

    public getCSSClasses() {
        return [
            Prompt.getCSSBaseClass(),
            this.getCSSClass(),
        ];
    }

    /**
     * @param t_shell_command Can be null, if wanted to just preview the Prompt modal without really executing a shell command. Inputted values will still be assigned to target variables.
     * @param parsing_process
     * @param sc_event
     * @return Promise The boolean value tells whether the user wants to execute a shell command (true) or cancel (false).
     */
    public openPrompt(t_shell_command: TShellCommand | null, parsing_process: ShellCommandParsingProcess | null, sc_event: SC_Event | null): Promise<boolean> {
        const can_open_prompt_result = this.canOpenPrompt();
        if (true !== can_open_prompt_result) {
            // Some error is preventing opening the prompt.
            // A human-readable error message is contained in can_open_prompt_result.
            debugLog("Could not open Prompt " + this.getID() + " because of error: " + can_open_prompt_result);
            this.plugin.newError(can_open_prompt_result);
            return Promise.resolve(false); // false: Cancel execution (pretends that a user cancelled it, but it's ok).
        }

        debugLog("Opening Prompt " + this.getID());

        const modal = new PromptModal(
            this.plugin,
            this.prompt_fields,
            t_shell_command,
            parsing_process,
            this,
            sc_event,
            () => {return this.validateFields();}
        );
        modal.open();
        return modal.promise;
    }

    private canOpenPrompt(): true | string {

        // Check that all PromptFields have no configuration errors.
        for (const prompt_field of this.prompt_fields) {
            const validity: string | true = prompt_field.isConfigurationValid();
            if ("string" === typeof validity) {
                // An error is detected.
                return `Cannot open prompt '${this.getTitle()}': ${validity}`;
            }
        }

        // All ok.
        return true;
    }

    /**
     * Creates PromptField instances, NOT setting fields!
     */
    private createFields() {
        debugLog("Creating fields for Prompt " + this.getID());
        const prompt_field_model = getModel<PromptFieldModel>(PromptFieldModel.name);
        this.prompt_fields = prompt_field_model.loadInstances(this);
    }

    /**
     * Validates values in PromptField instances, NOT setting fields!
     */
    private validateFields(): Promise<void> {
        debugLog("Validating fields for Prompt " + this.getID());

        // Iterate all fields and check their validity.
        const error_messages: string[] = [];
        this.prompt_fields.forEach((prompt_field: PromptField) => {

            // Check if the field has parsing errors.
            const parsing_errors: string[] = prompt_field.getParsingErrors();
            for (const parsing_error of parsing_errors) {
                // This field has parsing error(s).
                error_messages.push(`'${prompt_field.getTitle()}': ` + parsing_error);
            }

            // Check other validity.
            if (!prompt_field.validate()) {
                // This field failed to validate.
                // TODO: Change this so that the message will come from prompt_field.validate().
                error_messages.push(`'${prompt_field.getTitle()}' needs to be filled.`);
            }
        });

        // Return the result.
        if (0 === error_messages.length) {
            return Promise.resolve();
        } else {
            return Promise.reject(error_messages);
        }
    }

    /**
     * When previewing a PromptModal, there is no real shell command available (because no shell command has triggered the
     * PromptModal). This method creates just a dummy shell command string that imitates a command that would echo variable values.
     */
    public getExampleShellCommand(): string {
        const variable_names: string[] = [];
        for (const prompt_field of this.prompt_fields) {
            variable_names.push(prompt_field.getTargetVariableInstance().getFullName());
        }
        return "echo "+variable_names.join(" ");
    }
    
    protected _getUsages(): UsageContainer {
        const usages: UsageContainer = new UsageContainer(this.getTitle());
        
        for (const tShellCommand of this.plugin.getTShellCommandsAsMap().values()) {
            const promptIdsUsedByShellCommand: (string | undefined)[] = Object.values(tShellCommand.getConfiguration().preactions).map((preactionConfiguration: Preaction_Prompt_Configuration) => preactionConfiguration?.prompt_id);
            if (promptIdsUsedByShellCommand.contains(this.getID())) {
                usages.addUsage(
                    {
                        title: tShellCommand.getAliasOrShellCommand(),
                    },
                    "shellCommands",
                );
            }
        }
        
        return usages;
    }
    
    /**
     * Returns {{variables}} used in this Prompt's title, description and execution button.
     *
     * @protected
     */
    protected _getUsedCustomVariables(): VariableMap {
        // Gather parseable content.
        const readVariablesFrom: string[] = [
            this.configuration.title,
            this.configuration.description,
            this.configuration.execute_button_text,
        ];
        
        return getUsedVariables(
            this.plugin,
            readVariablesFrom,
            this.plugin.getCustomVariables(),
        );
    }
}

export interface PromptConfiguration {
    id: string;
    title: string;
    description: string;
    preview_shell_command: boolean;
    fields: PromptFieldConfiguration[];
    execute_button_text: string;
}