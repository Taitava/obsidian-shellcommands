import {
    CustomVariableInstance,
    DEBUG_ON,
    SC_Plugin,
    Variable,
    Variable_CaretPosition,
    Variable_Clipboard,
    Variable_Date,
    Variable_EventFileExtension,
    Variable_EventFileName,
    Variable_EventFilePath,
    Variable_EventFolderName,
    Variable_EventFolderPath,
    Variable_EventTags,
    Variable_EventTitle,
    Variable_EventYAMLValue,
    Variable_FileExtension,
    Variable_FileName,
    Variable_FilePath,
    Variable_FolderName,
    Variable_FolderPath,
    Variable_Passthrough,
    Variable_Selection,
    Variable_Tags,
    Variable_Title,
    Variable_VaultPath,
    Variable_Workspace,
    Variable_YAMLValue,
} from "src/imports";

export function loadVariables(plugin: SC_Plugin): VariableSet {

    const variables = new VariableSet([]);

    // Load CustomVariables
    // Do this before loading built-in variables so that these user-defined variables will appear first in all lists containing variables.
    plugin.getCustomVariableInstances().forEach((custom_variable_instance: CustomVariableInstance) => {
        variables.add(custom_variable_instance.createCustomVariable())
    });

    // Load built-in variables.
    const built_in_variables: Variable[] = [
        // Normal variables
        new Variable_CaretPosition(plugin),
        new Variable_Clipboard(plugin),
        new Variable_Date(plugin),
        new Variable_FileExtension(plugin),
        new Variable_FileName(plugin),
        new Variable_FilePath(plugin),
        new Variable_FolderName(plugin),
        new Variable_FolderPath(plugin),
        new Variable_Selection(plugin),
        new Variable_Tags(plugin),
        new Variable_Title(plugin),
        new Variable_VaultPath(plugin),
        new Variable_Workspace(plugin),
        new Variable_YAMLValue(plugin),

        // Event variables
        new Variable_EventFileExtension(plugin),
        new Variable_EventFileName(plugin),
        new Variable_EventFilePath(plugin),
        new Variable_EventFolderName(plugin),
        new Variable_EventFolderPath(plugin),
        new Variable_EventTags(plugin),
        new Variable_EventTitle(plugin),
        new Variable_EventYAMLValue(plugin),
    ];
    if (DEBUG_ON) {
        // Variables that are only designed for 'Shell commands test suite'.
        built_in_variables.push(
            new Variable_Passthrough(plugin),
        );
    }
    for (const built_in_variable of built_in_variables) {
        // JavaScript's Set does not have a method to add multiple items at once, so need to iterate them and add one-by-one.
        variables.add(built_in_variable);
    }

    return variables;
}

export class VariableSet extends Set<Variable> {}