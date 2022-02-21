import {
    PromptField,
    PromptField_Text,
    PromptFieldConfiguration,
} from "../../imports";

export function createPromptField(container_element: HTMLElement, field_configuration: PromptFieldConfiguration): PromptField {
    // switch (field_configuration.type) { // TODO: Uncomment when implementing the type property, i.e. when adding more types.
    //     case "text":
            return new PromptField_Text(container_element, field_configuration);
    // }
}

