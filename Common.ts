import {App, Editor, FileSystemAdapter, MarkdownView} from "obsidian";

export function getVaultAbsolutePath(app: App) {
    // Original code was copied 2021-08-22 from https://github.com/phibr0/obsidian-open-with/blob/84f0e25ba8e8355ff83b22f4050adde4cc6763ea/main.ts#L66-L67
    // But the code has been rewritten 2021-08-27 as per https://github.com/obsidianmd/obsidian-releases/pull/433#issuecomment-906087095
    let adapter = app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }
    return null;
}

export function isWindows() {
    return process.platform === "win32";
}

export function getEditor(app: App): Editor {
    let view = app.workspace.getActiveViewOfType(MarkdownView);
    let view_mode = view.getMode(); // "preview" or "source" (can also be "live" but I don't know when that happens)
    switch (view_mode) {
        case "preview":
            // The leaf is in preview mode, which makes things difficult.
            // We could still return view.editor, but it does not work at least for getting selected text, maybe for other things, but currently this function is only used for getting selected text.
            // At this moment, just return null to indicate that we were not able to offer an editor instance which could work reliably on text selections.
            // FIXME: Find a way to work in preview mode, too!
            console.log("getEditor(): active_leaf is in preview mode, and the poor guy who wrote this code, does not know how to return an editor instance that could be used for getting text selection.")
            return null;
        case "source":
            // Ensure that view.editor exists! It exists at least if this is a MarkDownView.
            if ("editor" in view) {
                // Good, it exists.
                // @ts-ignore We already know that view.editor exists.
                return view.editor;
            }
            console.log("getEditor(): active_leaf.view does not have a property named 'editor'. Will return null.")
            return null;
        default:
            Error("getEditor(): Unrecognised view mode: "+view_mode);
            break;
    }
}