import {Setting} from "obsidian";
import {
    PromptField,
} from "../../../imports";

export class PromptField_Text extends PromptField {

    protected value: string;

    public createField(container_element: HTMLElement) {
        const initial_value: any = this.configuration.default_value;
        this.storeValue(initial_value);
        return new Setting(container_element)
            .setName(this.configuration.label)
            .addText(text => text
                .setValue(initial_value)
                .onChange(value => this.storeValue(value)),
            )
        ;
    }

    protected isFilled(): boolean {
        return this.value.length > 0;
    }
}