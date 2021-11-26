import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {getVaultAbsolutePath, normalizePath2} from "../Common";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_FilePath extends ShellCommandVariable{
    static variable_name = "file_path";

    protected static readonly parameters: IParameters = {
        mode: {
            options: ["absolute", "relative"],
            required: true,
        },
    };

    protected arguments: {
        mode: string;
    }

    generateValue(): string|null {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            switch (this.arguments.mode.toLowerCase()) {
                case "absolute":
                    return normalizePath2(getVaultAbsolutePath(this.app) + "/" + active_file.path);
                case "relative":
                    return normalizePath2(active_file.path); // Normalize to get a correct slash depending on platform. On Windows it should be \ .
            }
        } else {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}
addShellCommandVariableInstructions(
    "{{file_path:relative}} or {{file_path:absolute}}",
    "Gives path to the current file, either as absolute from the root of the file system, or as relative from the root of the Obsidian vault.",
);