import {SC_Modal} from "./SC_Modal";
import SC_Plugin from "./main";
import {Setting} from "obsidian";

export class ConfirmationModal extends SC_Modal {

    public promise: Promise<void>;
    private resolve_promise: (value: (void | PromiseLike<void>)) => void;
    private reject_promise: (reason?: any) => void;
    private yes_button_was_clicked = false;

    constructor(
        plugin: SC_Plugin,
        title: string,
        private question: string,
        private yes_button_text: string,
    ) {
        super(plugin);
        this.setTitle(title);
        this.promise = new Promise<void>((resolve, reject) => {
            this.resolve_promise = resolve;
            this.reject_promise = reject;
        });
    }

    public onOpen(): void {
        super.onOpen();

        // Display the question
        this.modalEl.createEl("p", {text: this.question});

        // Display the yes button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText(this.yes_button_text)
                .onClick(() => {
                    // Got a confirmation from a user
                    this.resolve_promise();
                    this.yes_button_was_clicked = true;
                    this.close();
                })
            )
        ;

    }

    public onClose(): void {
        super.onClose();

        if (!this.yes_button_was_clicked) { // TODO: Find out if there is a way to not use this kind of flag property. Can the status be checked from the promise itself?
            this.reject_promise();
        }
    }
}