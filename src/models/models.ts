import {introduceModelClass} from "./Model";
import {CustomVariableModel} from "./custom_variable/CustomVariableModel";
import SC_Plugin from "../main";

export function introduceModels(plugin: SC_Plugin) {
    introduceModelClass(new CustomVariableModel(plugin));
}
