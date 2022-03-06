import SC_Plugin from "../../main";
import {TShellCommand} from "../../TShellCommand";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {
    createPromptField,
    Instance,
    PromptField,
    PromptFieldConfiguration,
    PromptModal,
    PromptModel,
} from "../../imports";

export class Prompt extends Instance {

    private prompt_fields: PromptField[] = [];

    constructor(
        protected model: PromptModel,
        protected plugin: SC_Plugin,
        configuration: PromptConfiguration,
        parent_configuration: SC_MainSettings,
        public prompt_index: keyof SC_MainSettings["prompts"], // TODO: 'keyof' is kind of incorrect here, 'keyof' is for objects, but 'SC_MainSettings["custom_variables"]' is an array with numeric indexes.
    ) {
        super(model, configuration, parent_configuration);
        this.model.id_generator.addCurrentID(configuration.id);
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

    public openPrompt(t_shell_command: TShellCommand): Promise<void> {
        const fields_container_element = document.createElement("div");
        this.createFields(fields_container_element);
        const modal = new PromptModal(
            this.plugin,
            fields_container_element,
            t_shell_command,
            this,
            () => {return this.validateFields();}
        );
        modal.open();
        return modal.promise;
    }

    /**
     * Creates PromptField instances, NOT setting fields!
     */
    private createFields(container_element: HTMLElement) {
        this.prompt_fields = [];
        this.configuration.fields.forEach((field_configuration: PromptFieldConfiguration) => {
            this.prompt_fields.push(
                createPromptField(container_element, field_configuration)
            );
        });
    }

    /**
     * Validates values in PromptField instances, NOT setting fields!
     */
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
    preview_shell_command: boolean;
    fields: PromptFieldConfiguration[];
}