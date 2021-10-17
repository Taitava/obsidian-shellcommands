import {App, Editor, FileSystemAdapter, MarkdownView, normalizePath} from "obsidian";
import {OperatingSystemName} from "./settings/ShellCommandsPluginSettings";
import {platform} from "os";

export function getVaultAbsolutePath(app: App) {
    // Original code was copied 2021-08-22 from https://github.com/phibr0/obsidian-open-with/blob/84f0e25ba8e8355ff83b22f4050adde4cc6763ea/main.ts#L66-L67
    // But the code has been rewritten 2021-08-27 as per https://github.com/obsidianmd/obsidian-releases/pull/433#issuecomment-906087095
    let adapter = app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }
    return null;
}

/**
 * For some reason there is no Platform.isWindows .
 */
export function isWindows() {
    return process.platform === "win32";
}

/**
 * This is just a wrapper around platform() in order to cast the type to OperatingSystemName.
 */
export function getOperatingSystem(): OperatingSystemName  {
    // @ts-ignore In theory, platform() can return an OS name not included in OperatingSystemName. But as Obsidian
    // currently does not support anything else than Windows, Mac and Linux (except mobile platforms, but they are
    // ruled out by the manifest of this plugin), it should be safe to assume that the current OS is one of those
    // three.
    return platform();
}

export function getView(app: App) {
    let view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
        console.log("getView(): Could not get a view. Will return null.");
        return null;
    }
    return view;
}

export function getEditor(app: App): Editor {

    let view = getView(app);
    if (null === view) {
        // Could not get a view.
        return null;
    }

    // Ensure that view.editor exists! It exists at least if this is a MarkDownView.
    if ("editor" in view) {
        // Good, it exists.
        // @ts-ignore We already know that view.editor exists.
        return view.editor;
    }

    // Did not find an editor.
    console.log("getEditor(): 'view' does not have a property named 'editor'. Will return null.");
    return null;
}

export function cloneObject(object: Object) {
    return Object.assign({}, object);
}

/**
 * Same as normalizePath(), but fixes these glitches:
 * - Leading forward slashes / backward slashes should not be removed.
 * - \ should not be converted to / if platform is Windows. In other words, / should be converted to \ if platform is Windows.
 *
 * TODO: I've opened a discussion about this on Obsidian's forums. If anything new comes up in the discussion, make changes accordingly. https://forum.obsidian.md/t/normalizepath-removes-a-leading/24713
 */
export function normalizePath2(path: string) {
    // 1. Preparations
    path = path.trim();
    let leading_slashes_regexp = /^[/\\]*/g; // Get as many / or \ slashes as there are in the very beginning of path. Can also be "" (an empty string).
    let leading_slashes = leading_slashes_regexp.exec(path)[0];

    // 2. Run the original normalizePath()
    path = normalizePath(path);

    // 3. Fixes
    // Check that correct slashes are used.
    if (isWindows()) {
        // The platform is Windows.
        // Convert / to \
        path = path.replace(/\//g, "\\"); // Need to use a regexp instead of a normal "/" -> "\\" replace because the normal replace would only replace first occurrence of /.
        leading_slashes = leading_slashes.replace(/\//g, "\\"); // Same here.
    }
    // Now ensure that path still contains leading slashes (if there were any before calling normalizePath()).
    // Check that the path should have a similar set of leading slashes at the beginning. It can be at least "/" (on linux/Mac), or "\\" (on Windows when it's a network path), in theory even "///" or "\\\\\" whatever.
    // normalizePath() seems to remove leading slashes (and they are needed to be re-added), but it's needed to check first, otherwise the path would have double leading slashes if normalizePath() gets fixed in the future.
    if (leading_slashes.length && path.slice(0, leading_slashes.length) !== leading_slashes) {
        // The path does not contain the required set of leading slashes, so add them.
        path = leading_slashes + path;
    }

    // 4. Done
    return path;
}

export function joinObjectProperties(object: {}, glue: string) {
    let result = "";
    for (let property_name in object) {
        if (result.length) {
            result += glue;
        }
        // @ts-ignore
        result += object[property_name];
    }
    return result;
}

/**
 * Removes all duplicates from an array.
 *
 * Idea is copied 2021-10-06 from https://stackoverflow.com/a/33121880/2754026
 */
export function uniqueArray(array: any[]) {
    return [...new Set(array)];
}