import {FileVariable} from "./FileVariable";
import {getFileYAMLContent} from "../Common";
import {IParameters} from "./Variable";

export class Variable_YAMLContent extends FileVariable {
    public variable_name = "yaml_content";
    public help_text = "Gives the current note's YAML frontmatter.";

    protected static parameters: IParameters = {
        "dashes": {
            options: ["with-dashes", "no-dashes"],
            required: true,
        },
    };

    protected arguments: {
        "dashes": "with-dashes" | "no-dashes",
    }

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const active_file = this.getFile();
            if (!active_file) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            getFileYAMLContent(this.app, active_file, this.shouldIncludeDashes()).then((file_content_without_yaml: string) => {
                if (null === file_content_without_yaml) {
                    // No YAML section is defined in the file
                    this.newErrorMessage("No YAML section is defined in " + active_file.name);
                    resolve(null);
                } else {
                    resolve(file_content_without_yaml);
                }
            });
        });
    }

    public async isAvailable(): Promise<boolean> {
        if (!super.isAvailable()) {
            return false;
        }

        return null !== await getFileYAMLContent(this.app, this.getFile(), this.shouldIncludeDashes());
    }

    private shouldIncludeDashes() {
        return this.arguments.dashes === "with-dashes";
    }
}