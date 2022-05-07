/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2022 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {Variable} from "./Variable";
import {Variable_Clipboard} from "./Variable_Clipboard";
import {Variable_CaretPosition} from "./Variable_CaretPosition";
import {Variable_Date} from "./Variable_Date";
import {Variable_FileExtension} from "./Variable_FileExtension";
import {Variable_FileName} from "./Variable_FileName";
import {Variable_FilePath} from "./Variable_FilePath";
import {Variable_FolderName} from "./Variable_FolderName";
import {Variable_FolderPath} from "./Variable_FolderPath";
import {Variable_Selection} from "./Variable_Selection";
import {Variable_Tags} from "./Variable_Tags";
import {Variable_Title} from "./Variable_Title";
import {Variable_VaultPath} from "./Variable_VaultPath";
import {Variable_Workspace} from "./Variable_Workspace";
import {DEBUG_ON} from "../Debug";
import {Variable_Passthrough} from "./Variable_Passthrough";
import SC_Plugin from "../main";
import {Variable_YAMLValue} from "./Variable_YAMLValue";
import {Variable_EventFileName} from "./event_variables/Variable_EventFileName";
import {Variable_EventFilePath} from "./event_variables/Variable_EventFilePath";
import {Variable_EventFolderName} from "./event_variables/Variable_EventFolderName";
import {Variable_EventFolderPath} from "./event_variables/Variable_EventFolderPath";
import {Variable_EventTitle} from "./event_variables/Variable_EventTitle";
import {Variable_EventFileExtension} from "./event_variables/Variable_EventFileExtension";
import {Variable_EventTags} from "./event_variables/Variable_EventTags";
import {Variable_EventYAMLValue} from "./event_variables/Variable_EventYAMLValue";
import {CustomVariableInstance} from "../models/custom_variable/CustomVariableInstance";

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