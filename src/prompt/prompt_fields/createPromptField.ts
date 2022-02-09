import {PromptField_Text} from "./PromptField_Text";
import {PromptField} from "./PromptField";
import {PromptFieldConfiguration} from "./PromptFieldConfiguration";

export function createPrompField(container_element: HTMLElement, field_configuration: PromptFieldConfiguration): PromptField {
    switch (field_configuration.type) {
        case "text":
            return new PromptField_Text(container_element, field_configuration);
    }
}

