import SC_Plugin from "../main";
import {TShellCommand} from "../TShellCommand";
import {
    Preaction_Prompt,
    Preaction_Prompt_Configuration,
} from "../imports";

export abstract class Preaction {

    protected constructor(
        protected readonly plugin: SC_Plugin,
        protected readonly configuration: PreactionConfiguration,
        protected readonly t_shell_command: TShellCommand,
    ) {}

    /**
     * Returns a boolean indicating whether the pipeline of preactions can proceed to the next preaction. False indicates
     * to cancel running any possible later preactions, and also cancels execution of the shell command. If all preactions'
     * promises return true, the shell command will be executed.
     * @protected
     */
    protected abstract doPreaction(): Promise<void>;

    /**
     * Maybe this wrapper method is unneeded, but have it for a while at least.
     */
    public perform(): Promise<void> {
        return this.doPreaction();
    }

    protected abstract getDefaultConfiguration(): PreactionConfiguration;
}

export function createPreaction(plugin: SC_Plugin, preaction_configuration: PreactionConfiguration, t_shell_command: TShellCommand): Preaction {
    switch (preaction_configuration.preaction_code) {
        case "prompt":
            return new Preaction_Prompt(plugin, (preaction_configuration as Preaction_Prompt_Configuration), t_shell_command);
    }
}

export interface PreactionConfiguration {
    preaction_code: "prompt";
    enabled: boolean;
}