import SC_Plugin from "../main";
import {SC_Modal} from "../SC_Modal";
import {
    Prompt,
    PromptConfiguration,
} from "../imports";
import {Setting} from "obsidian";

export class DeletePromptModal extends SC_Modal {
    constructor(
        plugin: SC_Plugin,
        private prompt: Prompt,
        private setting: Setting,
        private container_element: HTMLElement
    ) {
        super(plugin);
        this.setting = setting;
        this.container_element = container_element;
    }

    public onOpen(): void {
        super.onOpen();
        this.setTitle("Delete prompt: " + this.prompt.getTitle());

        const container_element = this.modalEl;
        container_element.createEl("p", {text: "Are you sure you want to delete this prompt?"});
        new Setting(container_element)
            .addButton(button => button
                .setButtonText("Yes, delete")
                .onClick(async () => {
                    // Delete the prompt from configuration
                    this.plugin.settings.prompts.forEach((prompt_configuration: PromptConfiguration, prompt_index: number) => {
                        if (prompt_configuration.id === this.prompt.getID()) {
                            // This is the prompt that should be deleted.
                            this.plugin.settings.prompts.splice(prompt_index); // Do not use delete, as it would place null in the list.
                        }
                    });

                    // Delete the setting field
                    this.container_element.removeChild(this.setting.settingEl);

                    // Save and close the modal
                    await this.plugin.saveSettings();
                    this.close();
                }),
            )
        ;
    }
}