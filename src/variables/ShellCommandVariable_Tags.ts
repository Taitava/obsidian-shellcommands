import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {IParameters, ShellCommandVariable} from "./ShellCommandVariable";
import {getAllTags} from "obsidian";
import {uniqueArray} from "../Common";

export class ShellCommandVariable_Tags extends ShellCommandVariable {
    static variable_name = "tags";
    static help_text = "Gives all tags defined in the current note. Replace the \"separator\" part with a comma, space or whatever characters you want to use as a separator between tags. A separator is always needed to be defined.";

    protected static readonly parameters: IParameters = {
        separator: {
            type: "string",
            required: true,
        }
    };

    protected arguments: {
        separator: string,
    };

    generateValue(): string {
        let active_file = this.app.workspace.getActiveFile();
        if (active_file) {
            // We do have an active file
            let cache = this.app.metadataCache.getFileCache(active_file);
            let tags: string[] = uniqueArray(getAllTags(cache)); // If a tag is defined multiple times in the same file, getTags() returns it multiple times, so use uniqueArray() to iron out duplicates.

            // Remove preceding hash characters. E.g. #tag becomes tag
            tags.forEach((tag: string, index) => {
                tags[index] = tag.replace("#", "");
            });

            return tags.join(this.arguments.separator);
        } else {
            // No file is active at the moment
            this.newErrorMessage("No file is active at the moment. Open a file or click a pane that has a file open.");
            return null; // null indicates that getting a value has failed and the command should not be executed.
        }
    }
}
addShellCommandVariableInstructions(
    "{{tags:separator}}",
    ShellCommandVariable_Tags.help_text,
);