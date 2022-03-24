import SC_Plugin from "../../main";
import {TShellCommand} from "../../TShellCommand";
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
} from "../../imports";

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
        this.model.id_generator.addCurrentID(configuration.id);

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
        ]
    }

    /**
     * @param t_shell_command Can be null, if wanted to just preview the Prompt modal without really executing a shell command. Inputted values will still be assigned to target variables.
     * @param sc_event
     */
    public openPrompt(t_shell_command: TShellCommand | null, sc_event: SC_Event | null): Promise<void> {
        const can_open_prompt_result = this.canOpenPrompt();
        if (true !== can_open_prompt_result) {
            // Some error is preventing opening the prompt.
            // A human-readable error message is contained in can_open_prompt_result.
            this.plugin.newError(can_open_prompt_result);
            return Promise.reject();
        }

        const modal = new PromptModal(
            this.plugin,
            this.prompt_fields,
            t_shell_command,
            this,
            sc_event,
            () => {return this.validateFields();}
        );
        modal.open();
        return modal.promise;
    }

    private canOpenPrompt(): true | string {

        // Check that all PromptFields have a target variable defined.
        for (const prompt_field of this.prompt_fields) {
            if (!prompt_field.configuration.target_variable_id) {
                return `Cannot open prompt: Field '${prompt_field.getTitle()}' does not have a target variable.`;
            } else {
                try {
                    prompt_field.getTargetVariableInstance(); // Just try to get a CustomVariableInstance. No need to use it here, but if this fails, we know the variable is removed.
                } catch (error) {
                    return `Cannot open prompt: Field '${prompt_field.getTitle()}' uses a target variable which does not exist anymore.`;
                }
            }
        }

        // All ok.
        return true;
    }

    /**
     * Creates PromptField instances, NOT setting fields!
     */
    private createFields() {
        const prompt_field_model = getModel<PromptFieldModel>(PromptFieldModel.name);
        this.prompt_fields = prompt_field_model.loadInstances(this)
    }

    /**
     * Validates values in PromptField instances, NOT setting fields!
     */
    private validateFields(): Promise<void> {

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
}

export interface PromptConfiguration {
    id: string;
    title: string;
    description: string;
    preview_shell_command: boolean;
    fields: PromptFieldConfiguration[];
    execute_button_text: string;
}