import {FileVariable} from "./FileVariable";

export class Variable_NoteContent extends FileVariable {
    public variable_name = "note_content";
    public help_text = "Gets the current note's content without YAML frontmatter.";

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const active_file = this.getFile();
            if (!active_file) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            const content = this.app.vault.read(active_file);
            content.then((file_content) => {
                // TODO: process file content: 1) remove YAML frontmatter, 2) return the result
            });

            this.newErrorMessage("This variable does not work yet.");
            return resolve(null);
        });
    }
}