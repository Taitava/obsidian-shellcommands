/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {SC_Modal} from "./SC_Modal";
import SC_Plugin from "./main";
import {Setting} from "obsidian";

export class ConfirmationModal extends SC_Modal {

    public promise: Promise<boolean>;
    private resolve_promise: (value: (boolean | PromiseLike<boolean>)) => void;
    private approved = false;
    
    /**
     * Can be used to add extra information to the modal, that will be shown between the modal's question and yes button.
     *
     * Note that when using this property, you SHOULD NOT overwrite existing content! Use extraContent.createEl() or
     * similar method that ADDS new content without replacing old content.
     */
    public extraContent: HTMLElement = document.createElement("div");

    constructor(
        plugin: SC_Plugin,
        title: string,
        private question: string,
        private yes_button_text: string,
    ) {
        super(plugin);
        this.setTitle(title);
        this.promise = new Promise<boolean>((resolve) => {
            this.resolve_promise = resolve;
        });
    }

    public onOpen(): void {
        super.onOpen();

        // Display the question
        this.modalEl.createEl("p", {text: this.question});

        // Display extra content/information. The element might be empty, if no extra content is added.
        this.modalEl.appendChild(this.extraContent);

        // Display the yes button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText(this.yes_button_text)
                .onClick(() => this.approve())
            )
        ;

    }

    protected approve(): void {
        // Got a confirmation from a user
        this.resolve_promise(true);
        this.approved = true;
        this.close();
    }

    public onClose(): void {
        super.onClose();

        if (!this.approved) { // TODO: Find out if there is a way to not use this kind of flag property. Can the status be checked from the promise itself?
            this.resolve_promise(false);
        }
    }
}