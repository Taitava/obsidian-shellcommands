import {FileVariable} from "./FileVariable";

export class Variable_FileContent extends FileVariable {
    public variable_name = "file_content";
    public help_text = "Gives the current file's content, including YAML frontmatter. If you need YAML excluded, use {{note_content}} instead.";

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const active_file = this.getFile();
            if (!active_file) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            // Retrieve file content.
            app.vault.read(active_file).then((file_content: string) => resolve(file_content));
        });
    }
}