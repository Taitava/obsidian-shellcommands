import {Setting} from "obsidian";
import {
    DeletePromptModal,
    Prompt,
} from "../../imports";
import SC_Plugin from "../../main";

export function createPromptSettingsField(plugin: SC_Plugin, container_element: HTMLElement, prompt: Prompt) {
    const setting = new Setting(container_element)
        // Configuration button
        .setName(prompt.getTitle())
        .addButton(button => button
            .setButtonText("Configure")
            .onClick(() => {
                prompt.openSettingsModal();
            }),
        )
        // Deletion icon
        .addExtraButton(button => button
            .setIcon("trash")
            .setTooltip("Delete this prompt")
            .onClick(() => {
                // Trash icon is clicked
                const modal = new DeletePromptModal(plugin, prompt, setting, container_element)
                modal.open();
            }),
        )
    ;
}