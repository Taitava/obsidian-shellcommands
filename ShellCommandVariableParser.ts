import {App, moment, normalizePath} from "obsidian";
import {getEditor, getVaultAbsolutePath} from "./Common";
import ShellCommandsPlugin from "./main";

let shell_command_variable_instructions: Object[] = [];

export function parseShellCommandVariables(plugin: ShellCommandsPlugin, command: string, enable_error_messages: boolean) {
    let shell_variables: ShellCommandVariable[] = [
        new ShellCommandVariable_Clipboard(plugin, enable_error_messages),
        new ShellCommandVariable_Date(plugin, enable_error_messages),
        new ShellCommandVariable_FileName(plugin, enable_error_messages),
        new ShellCommandVariable_FilePath(plugin, enable_error_messages),
        new ShellCommandVariable_FolderName(plugin, enable_error_messages),
        new ShellCommandVariable_FolderPath(plugin, enable_error_messages),
        new ShellCommandVariable_Selection(plugin, enable_error_messages),
        new ShellCommandVariable_Title(plugin, enable_error_messages),
        new ShellCommandVariable_VaultPath(plugin, enable_error_messages),
    ];
    let parsed_command = command; // Create a copy of the variable because we don't want to alter the original value of 'command' during iterating its regex matches.
    let parsing_failed = false;
    shell_variables.forEach((variable: ShellCommandVariable) => {
        let pattern = new RegExp(variable.getPattern(), "ig"); // i: case-insensitive; g: match all occurrences instead of just the first one.
        let match;
        while ((match = pattern.exec(command)) !== null) {
            let substitute = match[0];
            let argument = null;
            if (variable.has_argument && undefined !== match[1]) {
                // Extract an argument from the match.
                argument = match[1];
            }
            let variable_value = variable.getValue(argument);
            if (null === variable_value) {
                // The variable value getter has indicated that there has been a problem (probably in the passed argument) and executing the command should be cancelled. No need to continue iterating other variables.
                parsing_failed = true;
                // TODO: Find out how to break from forEach() so that we don't need to unnecessarily iterate the rest of the variables.
            }
            else
            {
                parsed_command = parsed_command.replace(substitute, variable_value);
            }
        }
    });
    if (parsing_failed) {
        return null;
    }
    return parsed_command;
}

export function getShellCommandVariableInstructions() {
    return shell_command_variable_instructions;
}

abstract class ShellCommandVariable {
    readonly plugin: ShellCommandsPlugin;
    readonly app: App;
    readonly enable_error_messages: boolean;
    readonly name: string;
    readonly has_argument: boolean = false;

    constructor(plugin: ShellCommandsPlugin, enable_error_messages: boolean) {
        this.plugin = plugin
        this.app = plugin.app;
        this.enable_error_messages = enable_error_messages;
    }

    abstract getValue(argument: string): string|null;

    getPattern() {
        let pattern = '\{\{' + this.name;
        if (this.has_argument) {
            pattern += ':(.+?)';
        }
        pattern += '\}\}';
        return pattern;
    }

    protected newError(message: string) {
        // Notifications can be disabled. This is done when previewing commands while they are being typed.
        if (this.enable_error_messages) {
            let prefix = "{{" + this.name + "}}: ";
            this.plugin.newError(prefix + message);
        }
    }
}


// DEFINE VARIABLE CLASSES BELOW
// (Keep them in alphabetical order so that the instructions will be displayed in a nice order.)

class ShellCommandVariable_Clipboard extends ShellCommandVariable {
    name = "clipboard";

    getValue(): string {
        let clipboard = require("electron").clipboard;
        return clipboard.readText();
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{clipboard}}",
    instructions: "Gives the content you last copied to your clipboard.",
});

class ShellCommandVariable_Date extends ShellCommandVariable {
    name = "date";
    has_argument = true;

    getValue(format: string): string {
        return moment().format(format);
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{date:format}}",
    instructions: "Gives a date/time stamp as per your liking. The \"format\" part can be customized and is mandatory. Formatting options: https://momentjs.com/docs/#/displaying/format/",
});

class ShellCommandVariable_FileName extends ShellCommandVariable{
    name = "file_name";
    getValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.name;
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{file_name}}",
    instructions: "Gives the current file name with a file extension.",
});

class ShellCommandVariable_FilePath extends ShellCommandVariable{
    name = "file_path";
    has_argument = true;
    getValue(mode: string): string|null {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            switch (mode) {
                case "absolute":
                    return normalizePath(getVaultAbsolutePath(this.app) + "/" + active_file.path);
                case "relative":
                    return active_file.path;
                default:
                    this.newError(`Unknown mode "${mode}"! Use "absolute" or "relative".`);
                    return null; // null indicates that getting a value has failed and the command should not be executed.
            }
        } else {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{file_path:relative}} or {{file_path:absolute}}",
    instructions: "Gives path to the current file, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.",
});

class ShellCommandVariable_FolderName extends ShellCommandVariable{
    name = "folder_name";
    getValue(): string {
        let file = this.app.workspace.getActiveFile();
        if (!file) {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        if (!file.parent) {
            this.newError("The current file does not have a parent for some strange reason.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
        return file.parent.name;
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{folder_name}}",
    instructions: "Gives the current file's parent folder name. No ancestor folders are included.",
});

class ShellCommandVariable_FolderPath extends ShellCommandVariable{
    name = "folder_path";
    has_argument = true;
    getValue(mode: string): string|null {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            if (active_file.parent) {
                let folder = active_file.parent;
                switch (mode) {
                    case "absolute":
                        return normalizePath(getVaultAbsolutePath(this.app) + "/" + folder.path);
                    case "relative":
                        return folder.path;
                    default:
                        this.newError(`Unknown mode "${mode}"! Use "absolute" or "relative".`);
                        return null; // null indicates that getting a value has failed and the command should not be executed.
                }
            } else {
                this.newError("The current file does not have a parent for some strange reason.");
                return null; // null indicates that getting a value has failed and the command should not be executed.
            }
        } else {
            this.newError("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{folder_path:relative}} or {{folder_path:absolute}}",
    instructions: "Gives path to the current file's parent folder, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.",
});

class ShellCommandVariable_Selection extends ShellCommandVariable{
    name = "selection";
    getValue(): string {
        let editor = getEditor(this.app);
        if (null === editor) {
            // Probably the leaf is in preview mode or some other problem happened.
            // FIXME: Make it possible to use this feature also in preview mode.
            this.newError("You need to turn editing mode on, as I'm not able to get selected text when in preview mode. Blame the one who developed this plugin! This should be fixed in the future.");
            return null;
        }
        if (editor.somethingSelected()) {
            return editor.getSelection();
        }
        return "";
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{selection}}",
    instructions: "Gives the currently selected text. Atm only works in editing mode, not in preview mode!",
});

class ShellCommandVariable_Title extends ShellCommandVariable{
    name = "title";
    getValue(): string {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            return active_file.basename;
        }
        this.newError("No file is active at the moment. Open a file or click a pane that has a file open.")
        return null;
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{title}}",
    instructions: "Gives the current file name without a file extension.",
});

class ShellCommandVariable_VaultPath extends ShellCommandVariable{
    name = "vault_path";
    getValue(): string {
        return getVaultAbsolutePath(this.app);
    }
}
shell_command_variable_instructions.push({
    variable_name: "{{vault_path}}",
    instructions: "Gives the Obsidian vault's absolute path from the root of the filesystem. This is the same that is used as a default working directory if you do not define one manually. If you define a working directory manually, this variable won't give you your manually defined directory, it always gives the vault's root directory.",
});