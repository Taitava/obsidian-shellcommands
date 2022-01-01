import {SC_Event} from "./SC_Event";
import {TShellCommand} from "../TShellCommand";
import {SC_EventConfiguration} from "./SC_EventConfiguration";
import {Notice, Setting} from "obsidian";


export class SC_Event_EveryNSeconds extends SC_Event {
    protected static readonly event_code = "every-n-seconds";
    protected static readonly event_title = "Every n seconds";
    protected default_configuration: Configuration = {
        enabled: false,
        seconds: 60,
    };
    private intervals_ids: {
        [key: string]: number; // key: TShellCommand id, value: setInterval() id.
    } = {};

    protected _register(t_shell_command: TShellCommand) {
        const milliseconds: number = this.getConfiguration(t_shell_command).seconds * 1000;
        let interval_id: number = window.setInterval(
            () => this.trigger(t_shell_command),
            milliseconds,
        );
        this.plugin.registerInterval(interval_id);
        this.intervals_ids[t_shell_command.getId()] = interval_id;
        return false; // The base class does not need to register anything.
    }

    protected _unregister(t_shell_command: TShellCommand): void {
        window.clearInterval(this.intervals_ids[t_shell_command.getId()]);
    }

    /**
     * Overridden only to change the return type.
     * @param t_shell_command
     * @protected
     */
    protected getConfiguration(t_shell_command: TShellCommand): Configuration {
        return super.getConfiguration(t_shell_command) as Configuration;
    }

    public createExtraSettingsFields(extra_settings_container: HTMLDivElement, t_shell_command: TShellCommand): void {
        const configuration: Configuration = this.getConfiguration(t_shell_command);
        let apply_seconds: number;
        new Setting(extra_settings_container)
            .setName("Seconds")
            .setDesc("Needs to be at least 1. Currently supports only integers.")
            .addText(text => text
                .setValue(configuration.seconds.toString())
                .onChange((raw_value: string) => {
                    apply_seconds = parseInt(raw_value);
                    // Don't save here, because the user might still be editing the number.
                }),
            )
            .addButton(button => button
                .setButtonText("Apply")
                .onClick(async () => {
                    if (undefined == apply_seconds || apply_seconds === this.getConfiguration(t_shell_command).seconds) {
                        new Notice("You didn't change the seconds!")
                    } else if (isNaN(apply_seconds)) {
                        new Notice("The seconds need to be an integer!")
                    } else if (apply_seconds <= 0) {
                        new Notice("The seconds need to be at least 1!")
                    } else {
                        // All ok, save.
                        this.getConfiguration(t_shell_command).seconds = apply_seconds;
                        await this.plugin.saveSettings();

                        // Re-register to apply the change
                        this.unregister(t_shell_command);
                        this.register(t_shell_command);

                        // Done
                        new Notice("The shell command will run every " + apply_seconds + " seconds");
                    }

                }),
            )
        ;
    }
}

interface Configuration extends SC_EventConfiguration {
    seconds: number,
}