/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
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
    private yes_button_was_clicked = false;

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

        // Display the yes button
        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText(this.yes_button_text)
                .onClick(() => {
                    // Got a confirmation from a user
                    this.resolve_promise(true);
                    this.yes_button_was_clicked = true;
                    this.close();
                })
            )
        ;

    }

    public onClose(): void {
        super.onClose();

        if (!this.yes_button_was_clicked) { // TODO: Find out if there is a way to not use this kind of flag property. Can the status be checked from the promise itself?
            this.resolve_promise(false);
        }
    }
}