// The idea of this "imports.ts" file is to avoid circular dependency loops by providing a single file for all imports.
// The idea is taken 2022-02-09 from https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de
// In the source website the file containing the export statements is called "internal.js" instead of "imports.ts", but I felt "imports" feels a bit more intuitive to me.

// TODO: Add all files here, and make all import statements in the project import from this file. Exception: External modules (Obsidian, Electron, Node.js, other libraries) can be imported directly from their sources, because they do not introduce a risk of circular dependencies.



// SECTIONS - Add new stuff in alphabetical order, if possible!

// Miscellaneous files in the same folder as imports.ts
export * from "./ConfirmationModal";
export * from "./IDGenerator";
export * from "./ShellCommandExecutor";

// Libraries by third parties (that are included in this repository).
export * from "./lib/escapeRegExp";

// Models - must come before subclasses of Model and Instance
export * from "./models/Instance";
export * from "./models/Model";
export * from "./models/models";

// Custom variables
export * from "./variables/CustomVariable";
export * from "./models/custom_variable/CustomVariableInstance";
export * from "./models/custom_variable/CustomVariableModel";
export * from "./models/custom_variable/CustomVariableSettingsModal";

// Preactions
export * from "./preactions/Preaction";
export * from "./preactions/Preaction_Prompt";

// Prompts
export * from "./models/prompt/prompt_fields/PromptField";
export * from "./models/prompt/prompt_fields/PromptFieldModel";
export * from "./models/prompt/prompt_fields/PromptField_Text";
export * from "./models/prompt/Prompt";
export * from "./models/prompt/PromptModal";
export * from "./models/prompt/PromptModel";

// Settings
export * from "./settings/PromptSettingsModal"; // TODO: Move the file to models/prompt/.
