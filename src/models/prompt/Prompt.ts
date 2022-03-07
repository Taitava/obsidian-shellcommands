import SC_Plugin from "../../main";
import {TShellCommand} from "../../TShellCommand";
import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {
    getModel,
    Instance,
    PromptField,
    PromptFieldConfiguration,
    PromptFieldMap,
    PromptFieldModel,
    PromptModal,
    PromptModel,
} from "../../imports";

export class Prompt extends Instance {

    public prompt_fields: PromptFieldMap = new PromptFieldMap();

    constructor(
        public model: PromptModel,
        protected plugin: SC_Plugin,
        public configuration: PromptConfiguration,
        public parent_configuration: SC_MainSettings,
        public prompt_index: keyof SC_MainSettings["prompts"], // TODO: 'keyof' is kind of incorrect here, 'keyof' is for objects, but 'SC_MainSettings["custom_variables"]' is an array with numeric indexes.
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

    public openPrompt(t_shell_command: TShellCommand): Promise<void> {
        const modal = new PromptModal(
            this.plugin,
            this.prompt_fields,
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
    private createFields() {
        const prompt_field_model = getModel<PromptFieldModel>(PromptFieldModel.name);
        this.prompt_fields = prompt_field_model.createInstances(this)
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