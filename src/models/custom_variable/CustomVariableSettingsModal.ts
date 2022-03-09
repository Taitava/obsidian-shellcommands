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
                .onClick(() => {
                    this.created = true;
                    this.on_after_creation();
                    this.close();
                }),
            )
        ;
    }

    public onClose(): void {
        super.onClose();

        if (!this.created) {
            this.on_after_cancelling();
        }
    }
}