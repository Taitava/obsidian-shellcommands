import {getEditor, getView} from "../Common";
import {addShellCommandVariableInstructions} from "./ShellCommandVariableInstructions";
import {ShellCommandVariable} from "./ShellCommandVariable";
import {debugLog} from "../Debug";

export class ShellCommandVariable_Selection extends ShellCommandVariable{
    name = "selection";
    generateValue(): string {

        // Check that we are able to get a view
        let view = getView(this.app);
        if (null === view) {
            // Nope.
            this.newErrorMessage("Could not get a view instance! Please raise an issue in GitHub.");
            return null;
        }

        // Check that we are able to get an editor
        let editor = getEditor(this.app);
        if (null === editor) {
            // Nope.
            this.newErrorMessage("Could not get an editor instance! Please raise an issue in GitHub.");
            return null;
        }

        // Check the view mode
        let view_mode = view.getMode(); // "preview" or "source" (can also be "live" but I don't know when that happens)
        switch (view_mode) {
            case "preview":
                // The leaf is in preview mode, which makes things difficult.
                // We could still return view.editor, but it does not work at least for getting selected text, maybe for other things, but currently this function is only used for getting selected text.
                // At this moment, just return null to indicate that we were not able to offer an editor instance which could work reliably on text selections.
                // FIXME: Make it possible to use this feature also in preview mode.
                debugLog("ShellCommandVariable_Selection: 'view' is in preview mode, and the poor guy who wrote this code, does not know how to return an editor instance that could be used for getting text selection.");
                this.newErrorMessage("You need to turn editing mode on, as I'm not able to get selected text when in preview mode. Blame the one who developed this plugin! This should be fixed in the future.");
                return null;
            case "source":
                // Good, the editor is in "source" mode, so it's possible to get a selection.
                if (editor.somethingSelected()) {
                    return editor.getSelection();
                }
                return "";
            default:
                Error("ShellCommandVariable_Selection: Unrecognised view mode: "+view_mode);
                break;
        }
    }
}
addShellCommandVariableInstructions(
    "{{selection}}",
    "Gives the currently selected text. Atm only works in editing mode, not in preview mode!",
);