import {
    Setting,
    TextComponent,
} from "obsidian";
import {SC_Event} from "../../../events/SC_Event";
import {
    PromptField,
} from "../../../imports";

export class PromptField_Text extends PromptField {

    private text_component: TextComponent;

    protected _createField(container_element: HTMLElement, sc_event: SC_Event | null) {
        new Setting(container_element)
            .setName(this.configuration.label)
            .addText((text_component) => {
                this.text_component = text_component;
                text_component.onChange(() => this.valueHasChanged(sc_event));
            })
        ;
    }

    protected setValue(value: string): void {
        this.text_component.setValue(value);
    }

    protected getValue(): string {
        return this.text_component.getValue();
    }

    protected isFilled(): boolean {
        return this.getValue().length > 0;
    }
}