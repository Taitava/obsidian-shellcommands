import {FileVariable} from "./FileVariable";
import {getFileContentWithoutYAML} from "../Common";

export class Variable_NoteContent extends FileVariable {
    public variable_name = "note_content";
    public help_text = "Gets the current note's content without YAML frontmatter.";

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const active_file = this.getFile();
            if (!active_file) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            getFileContentWithoutYAML(this.app, active_file).then((file_content_without_yaml: string) => {
                resolve(file_content_without_yaml);
            });

            this.newErrorMessage("This variable does not work yet.");
            return resolve(null);
        });
    }
}