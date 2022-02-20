export interface PromptFieldConfiguration {
    type: "text";
    label: string;
    default_value: string;
    target_variable: string;
    required: boolean;
}

export function getDefaultPrompFieldConfiguration(): PromptFieldConfiguration {
    return {
        type: "text",
        label: "",
        default_value: "",
        target_variable: "",
        required: true,
    }
}
