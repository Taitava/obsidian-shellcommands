import {SC_MainSettings} from "../../settings/SC_MainSettings";
import {
    CustomVariable,
    CustomVariableConfiguration,
    CustomVariableModel,
    Instance,
} from "../../imports";

/**
 * This class serves as an accessor to CustomVariable configurations. It's paired with the CustomVariable class, which acts
 * as an operational class to implement the variable functionality.
 *
 * TODO: Decide a better name for this class. It's too easy to confuse with the CustomVariable class name.
 */
export class CustomVariableInstance extends Instance {
    public readonly parent_configuration: SC_MainSettings;
    public configuration: CustomVariableConfiguration;
    private custom_variable: CustomVariable = null;

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

    public getFullName() {
        return `{{${this.getPrefixedName()}}}`;
    }

    /**
     * Adds an underscore in front of the name.
     */
    public getPrefixedName() {
        return "_" + this.configuration.name;
    }

    public getTitle(): string {
        return this.getFullName();
    }

    public getCustomVariable(): CustomVariable {
        if (!this.custom_variable) {
            throw new Error(this.constructor.name + ".getVariable(): Cannot find a CustomVariable. Maybe it's not loaded?");
        }
        return this.custom_variable;
    }

    public createCustomVariable(): CustomVariable {
        this.custom_variable = new CustomVariable(this.model.plugin, this);
        this.custom_variable.onChange(() => this.model.plugin.updateCustomVariableViews());
        return this.custom_variable;
    }
}