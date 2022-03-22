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

}

export interface PromptConfiguration {
    id: string;
    title: string;
    description: string;
    preview_shell_command: boolean;
    fields: PromptFieldConfiguration[];
    execute_button_text: string;
}