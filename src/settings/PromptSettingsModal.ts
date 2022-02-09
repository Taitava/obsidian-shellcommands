import {SC_Modal} from "../SC_Modal";
import SC_Plugin from "../main";
import {Setting} from "obsidian";
import {
    Prompt,
} from "../imports";

export class PromptSettingsModal extends SC_Modal {

    constructor(
        plugin: SC_Plugin,
        private readonly prompt: Prompt,
    ) {
        super(plugin);
    }

    public onOpen(): void {
        super.onOpen();
        const container_element = this.modalEl;

        new Setting(container_element)
            .setName("Prompt title")
            .addText(text => text
                .setValue(this.prompt.getTitle())
                .onChange(async (new_title: string) => {
                    this.prompt.getConfiguration().title = new_title;
                    await this.plugin.saveSettings();
                }),
            )

            // Focus on the text field
            .controlEl.find("input").focus()
        ;
    }
}