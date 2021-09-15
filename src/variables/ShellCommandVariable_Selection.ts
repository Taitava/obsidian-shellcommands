import {getEditor} from "../../Common";
import {shell_command_variable_instructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";

export class ShellCommandVariable_Selection extends ShellCommandVariable{
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