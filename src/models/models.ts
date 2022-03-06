import SC_Plugin from "../main";
import {
    CustomVariableModel,
    introduceModelClass,
    PromptFieldModel,
    PromptModel,
} from "../imports";

export function introduceModels(plugin: SC_Plugin) {
    // Keep in alphabetical order, if possible.
    introduceModelClass(new CustomVariableModel(plugin));
    introduceModelClass(new PromptFieldModel(plugin));
    introduceModelClass(new PromptModel(plugin));
}
