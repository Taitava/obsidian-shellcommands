import {Setting} from "obsidian";
import {
    Prompt
} from "../../imports";

export function createPromptSettingsField(container_element: HTMLElement, prompt: Prompt) {
    new Setting(container_element)
        .setName(prompt.getTitle())
        .addButton(button => button
            .setButtonText("Configure")
            .onClick(() => {
                // TODO
            }),
        )
    ;
}