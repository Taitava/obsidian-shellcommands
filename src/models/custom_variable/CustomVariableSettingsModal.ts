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

import {SC_Modal} from "../../SC_Modal";
import SC_Plugin from "../../main";
import {
    CustomVariableInstance,
    CustomVariableModel,
    getModel,
} from "../../imports";
import {Setting} from "obsidian";

export class CustomVariableSettingsModal extends SC_Modal {

    private created = false;

    constructor(
        plugin: SC_Plugin,
        private readonly custom_variable_instance: CustomVariableInstance,
        private readonly on_after_creation: () => void,
        private readonly on_after_cancelling: () => void,
    ) {
        super(plugin);
    }

    public onOpen(): void {
        super.onOpen();

        const model = getModel<CustomVariableModel>(CustomVariableModel.name);
        model.createSettingFields(this.custom_variable_instance, this.modalEl, false);

        new Setting(this.modalEl)
            .addButton(button => button
                .setButtonText("Create")
                .onClick(() => this.approve()),
            )
        ;
    }

    protected approve(): void {
        this.created = true;
        this.on_after_creation();
        this.close();
    }

    public onClose(): void {
        super.onClose();

        if (!this.created) {
            this.on_after_cancelling();
        }
    }
}