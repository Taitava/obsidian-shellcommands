import SC_Plugin from "../main";
import {TShellCommand} from "../TShellCommand";
import {SC_Event} from "../events/SC_Event";
import {VariableSet} from "../variables/loadVariables";
import {
    Preaction_Prompt,
    Preaction_Prompt_Configuration,
} from "../imports";

export abstract class Preaction {

    protected constructor(
        protected readonly plugin: SC_Plugin,
        public readonly configuration: PreactionConfiguration,
        protected readonly t_shell_command: TShellCommand,
    ) {}

    /**
     * Returns a boolean indicating whether the pipeline of preactions can proceed to the next preaction. False indicates
     * to cancel running any possible later preactions, and also cancels execution of the shell command. If all preactions'
     * promises return true, the shell command will be executed.
     * @protected
     */
    protected abstract doPreaction(sc_event: SC_Event): Promise<void>;

    /**
     * Maybe this wrapper method is unneeded, but have it for a while at least.
     */
    public perform(sc_event: SC_Event): Promise<void> {
        return this.doPreaction(sc_event);
    }

    protected abstract getDefaultConfiguration(): PreactionConfiguration; // TODO: Remove if this won't be used.

    /**
     * Returns variables that are dependent of this Preaction, i.e. variables whose value is set by this Preaction.
     * If a variable is READ by a Preaction, it is NOT considered to be _dependent_ of the Preaction, as long as the variable's
     * value is not changed by the Preaction.
     *
     * By default, it returns an empty VariableSet, because not all Preactions will use variables at all.
     */
    public getDependentVariables(): VariableSet {
        return new VariableSet();
    }
}

export function createPreaction(plugin: SC_Plugin, preaction_configuration: PreactionConfiguration, t_shell_command: TShellCommand): Preaction {
    switch (preaction_configuration.type) {
        case "prompt":
            return new Preaction_Prompt(plugin, (preaction_configuration as Preaction_Prompt_Configuration), t_shell_command);
    }
}

export interface PreactionConfiguration {
    type: "prompt";
    enabled: boolean;
}