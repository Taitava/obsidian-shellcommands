import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_NoteContent extends ShellCommandVariable{
    name = "note_content";
    getValue(): string {
        let active_file = this.app.workspace.getActiveFile();
        if (!active_file) {
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }

        const content = this.app.vault.read(active_file);
        content.then((file_content) => {
            // TODO: process file content: 1) remove YAML frontmatter, 2) return the result
        });

        this.newErrorMessage("This variable does not work yet.");
        return null;
    }
}
addShellCommandVariableInstructions(
    "{{note_content}}",
    "Gets the current note's content without YAML frontmatter.",
);