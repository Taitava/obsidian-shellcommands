import {SC_Modal} from "../../SC_Modal";
import {TShellCommand} from "../../TShellCommand";
import SC_Plugin from "../../main";
import {Setting} from "obsidian";
import {
    Prompt,
    PromptField,
    PromptFieldSet,
} from "../../imports";

export class PromptModal extends SC_Modal {

    public promise: Promise<void>;
    private user_confirmed_ok = false;
    private resolve_promise: (value: (void | PromiseLike<void>)) => void;
    private reject_promise: (reason?: any) => void;

    constructor(
        plugin: SC_Plugin,
        private readonly prompt_fields: PromptFieldSet,
        private readonly t_shell_command: TShellCommand,
        private readonly prompt: Prompt,

        /** A function that is called when a user clicks the execution button. This function should check the form elements' validity and return false if there are unfilled fields. */
        private readonly validator: () => boolean,
    ) {
        super(plugin);
        this.promise = new Promise<void>((resolve, reject) => {
            this.resolve_promise = resolve;
            this.reject_promise = reject;
        });
    }

    public onOpen() {
        super.onOpen();

        this.setTitle(this.prompt.getTitle());

        // Information about the shell command (if wanted)
        if (this.prompt.getConfiguration().preview_shell_command) {
            if (this.t_shell_command.getAlias()) {
                this.modalEl.createEl("p", {text: this.t_shell_command.getAlias(), attr: {class: "SC-no-margin"}});
            }
            this.modalEl.createEl("pre", {text: this.t_shell_command.getShellCommand(), attr: {class: "SC-no-margin"}});
            this.modalEl.createEl("hr");
        }

        // Create fields
        this.prompt_fields.forEach((prompt_field: PromptField) => {
            prompt_field.createField(this.modalEl);
        });

        // Execute button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText(this.prompt.configuration.execute_button_text)
                .onClick(() => {
                    if (this.validator()) {
                        // The form fields are filled ok
                        this.resolve_promise();
                        this.user_confirmed_ok = true;
                        this.close();
                    } else {
                        // Some mandatory fields are not filled
                        this.plugin.newError("A mandatory field is missing a value.");
                    }
                })
            )
        ;
    }

    public onClose(): void {
        super.onClose();

        if (!this.user_confirmed_ok) { // TODO: Find out if there is a way to not use this kind of flag property. Can the status be checked from the promise itself?
            this.reject_promise();
        }
    }
}