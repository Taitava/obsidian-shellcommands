export interface PromptFieldConfiguration {
    // type: "text"; // TODO: Uncomment when implementing more values than just "text". No need to decide the value "text" now, it can be changed to "single-line-text" or something else, too.
    label: string;
    default_value: string;
    target_variable: string;
    required: boolean;
}

export function getDefaultPrompFieldConfiguration(): PromptFieldConfiguration {
    return {
        // type: "text",
        label: "",
        default_value: "",
        target_variable: "",
        required: true,
    }
}
