import {Setting} from "obsidian";
import {
    Prompt
} from "../../imports";

export function createPromptField(container_element: HTMLElement, prompt: Prompt) {
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