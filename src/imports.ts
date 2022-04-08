// The idea of this "imports.ts" file is to avoid circular dependency loops by providing a single file for all imports.
// The idea is taken 2022-02-09 from https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de
// In the source website the file containing the export statements is called "internal.js" instead of "imports.ts", but I felt "imports" feels a bit more intuitive to me.


// SECTIONS - Add new stuff in alphabetical order, if possible!

// Miscellaneous files in the same folder as imports.ts
export * from "./Common";
export * from "./ConfirmationModal";
export * from "./Debug";
export * from "./Hotkeys";
export * from "./IDGenerator";
export * from "./Migrations";
export * from "./ObsidianCommandsContainer";
export * from "./SC_Modal";
export * from "./SC_Plugin";
export * from "./Shell";
export * from "./ShellCommandExecutor";
export * from "./TShellCommand";

// Libraries by third parties (that are included in this repository). TODO: Remove from this file.
export * from "./lib/escapeRegExp";

// Models - must come before subclasses of Model and Instance
export * from "./models/Instance";
export * from "./models/Model";
export * from "./models/models";
export * from "./models/createNewModelInstanceButton";

// Custom variables
export * from "./variables/CustomVariable";
export * from "./models/custom_variable/CustomVariableInstance";
export * from "./models/custom_variable/CustomVariableModel";
export * from "./models/custom_variable/CustomVariableSettingsModal";
export * from "./models/custom_variable/CustomVariableView";

// Documentation
export * from "./Documentation";

// Events
export * from "./events/SC_AbstractFileMenuEvent";
export * from "./events/SC_Event";
export * from "./events/SC_Event_EditorMenu";
export * from "./events/SC_Event_EveryNSeconds";
export * from "./events/SC_Event_FileMenu";
export * from "./events/SC_Event_FolderMenu";
export * from "./events/SC_Event_onActiveLeafChanged";
export * from "./events/SC_Event_onLayoutReady";
export * from "./events/SC_Event_onQuit";
export * from "./events/SC_EventConfiguration";
export * from "./events/SC_EventList";
export * from "./events/SC_MenuEvent";
export * from "./events/SC_WorkspaceEvent";

// Output channels
export * from "./output_channels/OutputChannel";
export * from "./output_channels/OutputChannelDriver";
export * from "./output_channels/OutputChannelDriver_CurrentFile";
export * from "./output_channels/OutputChannelDriver_Clipboard";
export * from "./output_channels/OutputChannelDriver_CurrentFileBottom";
export * from "./output_channels/OutputChannelDriver_CurrentFileCaret";
export * from "./output_channels/OutputChannelDriver_CurrentFileTop";
export * from "./output_channels/OutputChannelDriver_Modal";
export * from "./output_channels/OutputChannelDriver_Notification";
export * from "./output_channels/OutputChannelDriver_OpenFiles";
export * from "./output_channels/OutputChannelDriver_StatusBar";
export * from "./output_channels/OutputChannelDriverFunctions";

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
export * from "./models/prompt/PromptSettingsModal";

// Settings
export * from "./settings/setting_elements/Autocomplete";
export * from "./settings/setting_elements/CreatePlatformSpecificShellCommandField";
export * from "./settings/setting_elements/CreateShellCommandField";
export * from "./settings/setting_elements/CreateShellCommandFieldCore";
export * from "./settings/setting_elements/CreateShellSelectionField";
export * from "./settings/setting_elements/Tabs";
export * from "./settings/DeleteModal";
export * from "./settings/ExtraOptionsModal";
export * from "./settings/SC_MainSettings";
export * from "./settings/SC_MainSettingsTab";
export * from "./settings/ShellCommandConfiguration";

// Variables
export * from "./variables/escapers/AllSpecialCharactersEscaper";
export * from "./variables/escapers/Escaper";
export * from "./variables/escapers/EscapeValue";
export * from "./variables/escapers/PowerShellEscaper";
export * from "./variables/escapers/ShEscaper";
export * from "./variables/event_variables/EventVariable";
export * from "./variables/event_variables/Variable_EventFileName";
export * from "./variables/event_variables/Variable_EventFilePath";
export * from "./variables/event_variables/Variable_EventFolderName";
export * from "./variables/event_variables/Variable_EventFolderPath";
export * from "./variables/event_variables/Variable_EventTitle";
export * from "./variables/event_variables/Variable_EventFileExtension";
export * from "./variables/event_variables/Variable_EventTags";
export * from "./variables/event_variables/Variable_EventYAMLValue";
export * from "./variables/FileVariable";
export * from "./variables/FolderVariable";
export * from "./variables/getVariableAutocompleteItems";
export * from "./variables/loadVariables";
export * from "./variables/parseVariables";
export * from "./variables/ParsingProcess";
export * from "./variables/Variable";
export * from "./variables/VariableHelpers";
export * from "./variables/Variable_Clipboard";
export * from "./variables/Variable_CaretPosition";
export * from "./variables/Variable_Date";
export * from "./variables/Variable_FileExtension";
export * from "./variables/Variable_FileName";
export * from "./variables/Variable_FilePath";
export * from "./variables/Variable_FolderName";
export * from "./variables/Variable_FolderPath";
export * from "./variables/Variable_Selection";
export * from "./variables/Variable_Tags";
export * from "./variables/Variable_Title";
export * from "./variables/Variable_VaultPath";
export * from "./variables/Variable_Workspace";
export * from "./variables/Variable_Passthrough";
export * from "./variables/Variable_YAMLValue";
