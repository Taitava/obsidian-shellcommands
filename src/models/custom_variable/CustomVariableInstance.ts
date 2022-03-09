import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {
    CustomVariableConfiguration,
    CustomVariableModel,
    Instance,
} from "../../imports";

export class CustomVariableInstance extends Instance {
    public readonly parent_configuration: SC_MainSettings;
    public configuration: CustomVariableConfiguration;

    constructor(
        public readonly model: CustomVariableModel,
        configuration: CustomVariableConfiguration,
        parent_configuration: SC_MainSettings,
    ) {
        super(model, configuration, parent_configuration);

        // Introduce the ID to an ID generator so that it won't accidentally generate the same ID again when creating new CustomVariableInstances.
        this.model.id_generator.addCurrentID(configuration.id);
    }

    public getID() {
        return this.configuration.id;
    }

    public getTitle(): string {
        return this.configuration.name;
    }
}