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

import {Modal} from "obsidian";
import SC_Plugin from "./main";

export abstract class SC_Modal extends Modal {

    protected constructor (
        protected readonly plugin: SC_Plugin
    ) {
        super(plugin.app);
    }

    public onOpen(): void {

        // Make the modal scrollable if it has more content than what fits in the screen.
        this.modalEl.addClass("SC-scrollable");

        // Approve the modal by pressing the enter key (if enabled).
        if (this.plugin.settings.approve_modals_by_pressing_enter_key) {
            this.scope.register([], "enter", () => {
                // Check that no textarea is focused and no autocomplete menu is open.
                if (
                    0 === document.querySelectorAll("textarea:focus").length &&
                    0 === document.querySelectorAll("div.SC-autocomplete").length
                ) {
                    // No textareas with focus and no open autocomplete menus were found.
                    this.approve();
                }
            });
        }
    }

    protected setTitle(title: string) {
        this.titleEl.innerText = title;
    }

    /**
     * Called after a user presses the enter key (if approving modals by enter key press is enabled in settings). The purpose
     * of the method is to approve/perform the action the modal is asking/preparing. The method should then close the modal
     * by calling this.close() .
     * @protected
     */
    protected abstract approve(): void;

}