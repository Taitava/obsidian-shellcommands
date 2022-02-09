import {SC_Modal} from "../SC_Modal";
import {ParsingResult} from "../TShellCommand";
import SC_Plugin from "../main";
import {Setting} from "obsidian";

export class PromptModal extends SC_Modal {

    public promise: Promise<void>;
    private user_confirmed_ok = false;
    private resolve_promise: (value: (void | PromiseLike<void>)) => void;
    private reject_promise: (reason?: any) => void;

    constructor(
        plugin: SC_Plugin,
        private readonly content_container_element: HTMLElement,
        private readonly shell_command_parsing_result: ParsingResult,

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

        // Information about the shell command
        this.modalEl.createEl("h2", {text: this.shell_command_parsing_result.alias, attr: {style: "margin-bottom: 0;"}});
        if (this.shell_command_parsing_result.alias) {
            this.modalEl.createEl("p", {text: this.shell_command_parsing_result.shell_command, attr: {style: "margin-bottom: 0;"}});
        }

        // Add content
        this.modalEl.appendChild(this.content_container_element);

        // Execute button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText("Execute")
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