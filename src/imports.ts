/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2025 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
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

// The idea of this "imports.ts" file is to avoid circular dependency loops by providing a single file for all imports.
// The idea is taken 2022-02-09 from https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de
// In the source website the file containing the export statements is called "internal.js" instead of "imports.ts", but I felt "imports" feels a bit more intuitive to me.

// TODO: Add all files here, and make all import statements in the project import from this file. Exception: External modules (Obsidian, Electron, Node.js, other libraries) can be imported directly from their sources, because they do not introduce a risk of circular dependencies.



// SECTIONS - Add new stuff in alphabetical order, if possible!

// Miscellaneous files in the same folder as imports.ts
export * from "./Cacheable";
export * from "./ConfirmationModal";
export * from "./IDGenerator";
export * from "./ShellCommandExecutor";

// Libraries by third parties (that are included in this repository).
export * from "./lib/escapeRegExp";

// Models - must come before subclasses of Model and Instance
export * from "./models/Instance";
export * from "./models/Model";
export * from "./models/models";

// Custom shells
export * from "./models/custom_shell/CustomShellModel";

// Custom variables
export * from "./variables/CustomVariable";
export * from "./models/custom_variable/CustomVariableInstance";
export * from "./models/custom_variable/CustomVariableModel";
export * from "./models/custom_variable/CustomVariableSettingsModal";
export * from "./models/custom_variable/CustomVariableView";

// Output wrappers.
export * from "./models/output_wrapper/OutputWrapper";
export * from "./models/output_wrapper/OutputWrapperModel";
export * from "./models/output_wrapper/OutputWrapperSettingsModal";

// Preactions
export * from "./preactions/Preaction";
export * from "./preactions/Preaction_Prompt";

// Prompts
export * from "./models/prompt/prompt_fields/PromptField";
export * from "./models/prompt/prompt_fields/PromptFieldModel";
export * from "./models/prompt/Prompt";
export * from "./models/prompt/PromptModal";
export * from "./models/prompt/PromptModel";
export * from "./models/prompt/PromptSettingsModal";

// Settings
export * from "./settings/setting_elements/PathEnvironmentVariableFunctions";

// Shells
export * from "./shells/CustomShell";
export * from "./shells/Shell";
export * from "./shells/ShellFunctions";

// Usages.
export * from "./models/Usage";
export * from "./models/UsageContainer";

// Variables
export * from "./variables/ParsingProcess";
