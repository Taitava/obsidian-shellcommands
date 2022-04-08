import {SC_Modal} from "../../SC_Modal";
import {ShellCommandParsingProcess, TShellCommand} from "../../TShellCommand";
import SC_Plugin from "../../main";
import {Setting} from "obsidian";
import {SC_Event} from "../../events/SC_Event";
import {createMultilineTextElement} from "../../Common";
import {Variable, VariableValueResult} from "../../variables/Variable";
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

    public promise: Promise<boolean>;
    private user_confirmed_ok = false;
    private resolve_promise: (value: (boolean | PromiseLike<boolean>)) => void;

    constructor(
        plugin: SC_Plugin,
        private readonly prompt_fields: PromptFieldSet,
        /** Can be null, if wanted to just preview the Prompt modal without really executing a shell command. Inputted values will still be assigned to target variables. */
        private readonly t_shell_command: TShellCommand | null,
        private readonly parsing_process: ShellCommandParsingProcess | null,
        private readonly prompt: Prompt,
        private sc_event: SC_Event | null,

        /** A function that is called when a user clicks the execution button. This function should check the form elements' validity and return false if there are unfilled fields. */
        private readonly validator: () => Promise<void>,
    ) {
        super(plugin);
        this.promise = new Promise<boolean>((resolve) => {
            this.resolve_promise = resolve;
        });
    }

    public onOpen() {
        super.onOpen();

        // Parse and display title
        let title_parsing_result  = parseVariables(this.plugin, this.prompt.getTitle(), null, this.t_shell_command, this.sc_event);
        this.setTitle(
            title_parsing_result.succeeded
            ? title_parsing_result.parsed_content
            : title_parsing_result.original_content
        );

        // Parse and display description
        if (this.prompt.configuration.description) {
            let description_parsing_result: ParsingResult = parseVariables(this.plugin, this.prompt.configuration.description, null, this.t_shell_command, this.sc_event);
            const description =
                description_parsing_result.succeeded
                ? description_parsing_result.parsed_content
                : description_parsing_result.original_content
            ;
            const description_element = createMultilineTextElement("p", description, this.modalEl);
            description_element.addClass("setting-item-description"); // A CSS class defined by Obsidian.
        }

        // Preview the shell command (if wanted)
        // TODO: Extract to a separate method, as this is a big block of code.
        let update_shell_command_preview: (() => void) | null = null; // Stays null if .preview_shell_command is false.
        let focused_prompt_field: PromptField | undefined;
        if (this.prompt.getConfiguration().preview_shell_command) {
            let shell_command_preview_text: string;
            if (this.t_shell_command?.getAlias()) {
                this.modalEl.createEl("p", {text: this.t_shell_command.getAlias(), attr: {class: "SC-no-margin"}});
            }

            // Create "Show variable values" toggle
            let preview_variable_values: boolean = true;
            const variable_names_visible_icon: string = "code-glyph";
            const variable_values_visible_glyph: string = "price-tag-glyph";
            const preview_variable_values_setting = new Setting(this.modalEl)
                .addExtraButton(button => button
                    .setIcon(variable_values_visible_glyph)
                    .setTooltip("Toggle showing variable names or values.")
                    .onClick(() => {
                        preview_variable_values = !preview_variable_values;
                        button.setIcon(
                            preview_variable_values
                            ? variable_values_visible_glyph
                            : variable_names_visible_icon
                        )
                        update_shell_command_preview();
                    }),
                )
            ;

            // Decide what text to use in the preview
            if (this.parsing_process) {
                // Show a real shell command. Use preparsed content (= content that might have some variables already parsed).
                shell_command_preview_text = this.parsing_process.getParsingResults().shell_command.parsed_content;
            } else if (this.t_shell_command) {
                // Show a real shell command. No preparsed content is available. This content does not have any variables parsed yet.
                shell_command_preview_text = this.t_shell_command.getShellCommand();
            } else {
                // Make up a fake "shell command" for previewing.
                shell_command_preview_text = this.prompt.getExampleShellCommand();
                this.modalEl.createEl("p", {text: "(This is not a real shell command, it's just an example for this preview when no real shell command is available.)", attr: {class: "SC-no-margin SC-small-font"}});
            }
            this.modalEl.createEl("hr");

            // A function for handling preview text updates.
            update_shell_command_preview = () => {
                let shell_command_preview_text_final = shell_command_preview_text;
                if (preview_variable_values) {
                    // The preview should show the VALUES.

                    // Ensure the form fields do not contain any parsing errors. (If there are errors, an unparsed preview text will be shown).
                    if (this.getPromptFieldsParsingErrors().length === 0) {
                        // All fields are parsed ok (= individual parsing).
                        // Insert the field values into the shell command preview by parsing the preview text.

                        // Get current values from the prompt fields.
                        const fresh_values = this.getPromptFieldsValues(); // These PromptField values are fresh, so not yet stored in the actual variables.


                        // Parse variables in the shell command preview text.
                        const parsing_result = parseVariables(
                            this.plugin,
                            shell_command_preview_text,
                            this.getShell(),
                            this.t_shell_command,
                            this.sc_event,
                            undefined, // Use all variables.
                            (variable: Variable, raw_value: VariableValueResult): void => {
                                if (fresh_values.has(variable.variable_name)) {
                                    // Change the value to the one in the prompt field.
                                    raw_value.error_messages = []; // Remove any possible error messages.
                                    raw_value.succeeded = true; // This needs to reflect that there are no error messages.
                                    raw_value.value = fresh_values.get(variable.variable_name);
                                }
                                // No modifications.
                            },
                            (variable: Variable, escaped_value: string): string => {
                                // Emphasize the value that came from the currently focused field.
                                if (focused_prompt_field) {
                                    if (variable.variable_name.toLocaleLowerCase() === focused_prompt_field.getTargetVariableInstance().getPrefixedName().toLocaleLowerCase()) {
                                        // Make the value bold.
                                        return `<strong>${escaped_value}</strong>`;
                                    }
                                }
                                // No modifications.
                                return escaped_value;
                            },
                        );
                        if (parsing_result.succeeded) {
                            shell_command_preview_text_final = parsing_result.parsed_content;
                        }
                    }
                } else {
                    // The preview should show the VARIABLE NAMES.
                    if (focused_prompt_field) {
                        shell_command_preview_text_final = shell_command_preview_text_final.replace(
                            focused_prompt_field.getTargetVariableInstance().getFullName(), // TODO: Use focused_prompt_field.getTargetVariable().getPattern() instead. And make 'value' to be a callback.
                            "<strong>" + focused_prompt_field.getTargetVariableInstance().getFullName() + "</strong>",
                        );
                    }
                }
                preview_variable_values_setting.descEl.innerHTML = shell_command_preview_text_final;
            };
        }

        // Create fields
        let is_first_field = true;
        this.prompt_fields.forEach((prompt_field: PromptField) => {
            prompt_field.createField(
                this.modalEl.createDiv({attr: {class: "SC-setting-group"}}),
                this.t_shell_command,
                this.sc_event
            );
            if (update_shell_command_preview) {
                prompt_field.onChange(update_shell_command_preview);
            }
            prompt_field.onFocus((prompt_field: PromptField) => {
                focused_prompt_field = prompt_field;
                if (update_shell_command_preview) {
                    update_shell_command_preview();
                }
            });
            if (is_first_field) {
                // Focus on the first field.
                is_first_field = false;
                prompt_field.setFocus();
            }
        });
        if (update_shell_command_preview) {
            // Set a preview text. Must be done after fields are created, because their values are accessed.
            update_shell_command_preview();
        }

        // Tip about variables
        let tip = "";
        if (this.prompt_fields.size > 0) {
            // TODO: When implementing different field types, add a check that the tip is only shown when there are text/numeric fields present.
            // Only show the tip if this modal actually contains fields. Prompts can also be used as custom 'confirmation prompts' without any fields.
            tip = "Tip! You can use {{variables}} in text fields.";
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
                        this.resolve_promise(true);
                        this.user_confirmed_ok = true;
                        this.close();
                    }, (error_messages: string[] | any) => {
                        if (Array.isArray(error_messages)) {
                            // There were some problems with the fields.
                            this.plugin.newErrors(error_messages);
                        } else {
                            // Some other runtime error has occurred.
                            throw error_messages;
                        }
                    });
                })
            )
        ;

        if (!this.t_shell_command) {
            // Notice that this is a preview only Prompt.
            this.modalEl.createEl("p", {text: `This is a preview prompt. No shell command will be executed, but clicking the '${this.prompt.configuration.execute_button_text}' button will still store the inputted value(s) to variable(s).`}).addClass("SC-prompt-dry-run-notice");
        }

        // Add CSS classes so that custom styling can be done on a per-prompt modal basis (or for all prompt modals via a common class).
        this.modalEl.addClasses(this.prompt.getCSSClasses());
    }

    public onClose(): void {
        super.onClose();

        if (!this.user_confirmed_ok) { // TODO: Find out if there is a way to not use this kind of flag property. Can the status be checked from the promise itself?
            this.resolve_promise(false);
        }
    }

    private assignValuesToVariables() {
        for (const prompt_field of this.prompt_fields) {
            prompt_field.getTargetVariable().setValue(prompt_field.getParsedValue());
        }
    }

    /**
     * Gathers a Map of variable values typed in the form, but does not store the values into the variables. Called when
     * generating a preview text, so the result of this method will not persist in any way.
     * @private
     */
    private getPromptFieldsValues() {
        const values = new Map<string, string>();
        for (const prompt_field of this.prompt_fields) {
            values.set(prompt_field.getTargetVariable().variable_name, prompt_field.getParsedValue() ?? "");
        }
        return values;
    }

    private getPromptFieldsParsingErrors() {
        const parsing_errors: string[] = [];
        for (const prompt_field of this.prompt_fields) {
            parsing_errors.push(...prompt_field.getParsingErrors());
        }
        return parsing_errors;
    }

    private getShell() {
        if (this.t_shell_command) {
            // This is a real usage of the PromptModal, so a TShellCommand is available. Look up the shell from that.
            return this.t_shell_command.getShell();
        } else {
            // Just trying the PromptModal. Just use some shell for variable escaping in an example preview.
            return this.plugin.getDefaultShell();
        }
    }
}