import {FileVariable} from "./FileVariable";
import {
    getFileYAML,
} from "../Common";
import {IParameters} from "./Variable";
import {IAutocompleteItem} from "../settings/setting_elements/Autocomplete";

export class Variable_YAMLContent extends FileVariable {
    public variable_name = "yaml_content";
    public help_text = "Gives the current note's YAML frontmatter. Dashes --- can be included or excluded.";

    protected static readonly parameters: IParameters = {
        withDashes: {
            options: ["with-dashes", "no-dashes"],
            required: true,
        },
    };

    protected arguments: {
        withDashes: "with-dashes" | "no-dashes";
    }

    protected generateValue(): Promise<string|null> {
        return new Promise((resolve) => {
            const activeFile = this.getFile();
            if (!activeFile) {
                return resolve(null); // null indicates that getting a value has failed and the command should not be executed.
            }

            getFileYAML(this.app, activeFile, this.shouldUseDashes()).then((yamlContent: string) => {
                if (null === yamlContent) {
                    this.newErrorMessage("The current file does not contain a YAML frontmatter.");
                }
                resolve(yamlContent);
            });
        });
    }

    public async isAvailable(): Promise<boolean> {
        const activeFile = this.getFile();

        if (!await super.isAvailable() || !activeFile) {
            return false;
        }

        return null !== await getFileYAML(this.app, activeFile, this.shouldUseDashes());
    }

    public getAvailabilityText(): string {
        return super.getAvailabilityText() + " Also, a YAML frontmatter section needs to be present.";
    }

    private shouldUseDashes(): boolean {
        return "with-dashes" === this.arguments.withDashes;
    }

    public getAutocompleteItems() {
        return [
            // Normal variables
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":with-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, wrapped between --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{" + this.variable_name + ":no-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, excluding top and bottom --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "normal-variable",
                documentationLink: this.getDocumentationLink(),
            },

            // Unescaped variables
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":with-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, wrapped between --- lines." + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
            <IAutocompleteItem>{
                value: "{{!" + this.variable_name + ":no-dashes}}",
                help_text: "Gives the current note's YAML frontmatter, excluding top and bottom --- lines. " + this.getAvailabilityText(),
                group: "Variables",
                type: "unescaped-variable",
                documentationLink: this.getDocumentationLink(),
            },
        ];
    }

    public getHelpName(): string {
        return "<strong>{{yaml_content:with-dashes}}</strong> or <strong>{{yaml_content:no-dashes}}</strong>";
    }
}