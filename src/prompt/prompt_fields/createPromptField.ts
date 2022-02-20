import {
    PromptField,
    PromptField_Text,
    PromptFieldConfiguration,
} from "../../imports";

export function createPromptField(container_element: HTMLElement, field_configuration: PromptFieldConfiguration): PromptField {
    switch (field_configuration.type) {
        case "text":
            return new PromptField_Text(container_element, field_configuration);
    }
}

