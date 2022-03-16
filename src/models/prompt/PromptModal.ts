import {SC_Modal} from "../../SC_Modal";
import {TShellCommand} from "../../TShellCommand";
import SC_Plugin from "../../main";
import {Setting} from "obsidian";
import {SC_Event} from "../../events/SC_Event";
import {createMultilineTextElement} from "../../Common";
import {
    Prompt,
    PromptField,
    PromptFieldSet,
} from "../../imports";
import {
    parseVariables,
    ParsingResult,
} from "../../variables/parseVariables";

export class PromptModal extends SC_Modal {

    public promise: Promise<void>;
    private user_confirmed_ok = false;
    private resolve_promise: (value: (void | PromiseLike<void>)) => void;
    private reject_promise: (reason?: any) => void;

    constructor(
        plugin: SC_Plugin,
        private readonly prompt_fields: PromptFieldSet,
        /** Can be null, if wanted to just preview the Prompt modal without really executing a shell command. Inputted values will still be assigned to target variables. */
        private readonly t_shell_command: TShellCommand | null,
        private readonly prompt: Prompt,
        private sc_event: SC_Event | null,

        /** A function that is called when a user clicks the execution button. This function should check the form elements' validity and return false if there are unfilled fields. */
        private readonly validator: () => Promise<void>,
    ) {
        super(plugin);
        this.promise = new Promise<void>((resolve, reject) => {
            this.resolve_promise = resolve;
            this.reject_promise = reject;
        });
    }

    public onOpen() {
        super.onOpen();

        // Parse and display title
        let title_parsing_result  = parseVariables(this.plugin, this.prompt.getTitle(), null, null);
        this.setTitle(
            title_parsing_result.succeeded
            ? title_parsing_result.parsed_content
            : title_parsing_result.original_content
        );

        // Information about the shell command (if wanted)
        if (this.t_shell_command && this.prompt.getConfiguration().preview_shell_command) {
            if (this.t_shell_command.getAlias()) {
                this.modalEl.createEl("p", {text: this.t_shell_command.getAlias(), attr: {class: "SC-no-margin"}});
            }
            this.modalEl.createEl("pre", {text: this.t_shell_command.getShellCommand(), attr: {class: "SC-no-margin"}});
            this.modalEl.createEl("hr");
        }

        // Parse and display description
        if (this.prompt.configuration.description) {
            let description_parsing_result: ParsingResult = parseVariables(this.plugin, this.prompt.configuration.description, null, null);
            const description =
                description_parsing_result.succeeded
                ? description_parsing_result.parsed_content
                : description_parsing_result.original_content
            ;
            const description_element = createMultilineTextElement("p", description, this.modalEl);
            description_element.addClass("setting-item-description"); // A CSS class defined by Obsidian.
        }

        // Create fields
        this.prompt_fields.forEach((prompt_field: PromptField) => {
            prompt_field.createField(this.modalEl.createDiv({attr: {class: "SC-setting-group"}}), this.sc_event);
        });

        // Tip about variables
        let tip = "";
        if (this.prompt_fields.size > 0) {
            // TODO: When implementing different field types, add a check that the tip is only shown when there are text/numeric fields present.
            // Only show the tip if this modal actually contains fields. Prompts can also be used as custom 'confirmation prompts' without any fields.
            tip = "Tip! You can also use variables in text fields.";
        }

        // Execute button
        new Setting(this.modalEl)
            .setDesc(tip)
            .addButton(button => button
                .setButtonText(this.prompt.configuration.execute_button_text)
                .onClick(() => {
                    this.validator().then(() => {
                        // The form fields are filled ok
                        this.assignValuesToVariables();
                        this.resolve_promise();
                        this.user_confirmed_ok = true;
                        this.close();
                    }).catch((error_messages: string[]) => {
                        // There were some problems with the fields.
                        this.plugin.newErrors(error_messages);
                    });
                })
            )
        ;

        if (!this.t_shell_command) {
            // Notice that this is a preview only Prompt.
            this.modalEl.createEl("p", {text: `This is a preview Prompt. No shell command will be executed, but clicking the '${this.prompt.configuration.execute_button_text}' button will still store the inputted value(s) to variable(s).`}).addClass("SC-prompt-dry-run-notice");
        }
    }

    public onClose(): void {
        super.onClose();

        if (!this.user_confirmed_ok) { // TODO: Find out if there is a way to not use this kind of flag property. Can the status be checked from the promise itself?
            this.reject_promise();
        }
    }

    private assignValuesToVariables() {
        for (const prompt_field of this.prompt_fields) {
            prompt_field.getTargetVariable().setValue(prompt_field.getParsedValue());
        }
    }
}