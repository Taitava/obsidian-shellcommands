/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2023 Jarkko Linnanvirta
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.0 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Contact the author (Jarkko Linnanvirta): https://github.com/Taitava/
 */

import {
    App,
    Editor,
    EditorPosition,
    FileSystemAdapter,
    FrontMatterCache,
    MarkdownView,
    normalizePath,
    TFile,
} from "obsidian";
import {PlatformId} from "./settings/SC_MainSettings";
import {platform} from "os";
import * as path from "path";
import {debugLog} from "./Debug";
import SC_Plugin from "./main";
// @ts-ignore
import {shell} from "electron";
// @ts-ignore Electron is installed.
import {clipboard} from "electron";

export function getVaultAbsolutePath(app: App) {
    // Original code was copied 2021-08-22 from https://github.com/phibr0/obsidian-open-with/blob/84f0e25ba8e8355ff83b22f4050adde4cc6763ea/main.ts#L66-L67
    // But the code has been rewritten 2021-08-27 as per https://github.com/obsidianmd/obsidian-releases/pull/433#issuecomment-906087095
    const adapter = app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
        return adapter.getBasePath();
    }
    throw new Error("Could not retrieve vault path. No DataAdapter was found from app.vault.adapter.");
}

export function getPluginAbsolutePath(plugin: SC_Plugin) {
    return normalizePath2(path.join(
        getVaultAbsolutePath(plugin.app),
        plugin.app.vault.configDir,
        "plugins",
        plugin.getPluginId()));
}

/**
 * For some reason there is no Platform.isWindows .
 */
export function isWindows() {
    return process.platform === "win32";
}

/**
 * This is just a wrapper around platform() in order to cast the type to PlatformId.
 * TODO: Consider renaming this to getPlatformId().
 */
export function getOperatingSystem(): PlatformId  {
    // @ts-ignore In theory, platform() can return an OS name not included in OperatingSystemName. But as Obsidian
    // currently does not support anything else than Windows, Mac and Linux (except mobile platforms, but they are
    // ruled out by the manifest of this plugin), it should be safe to assume that the current OS is one of those
    // three.
    return platform();
}

export function getView(app: App) {
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
        debugLog("getView(): Could not get a view. Will return null.");
        return null;
    }
    return view;
}

export function getEditor(app: App): Editor | null {

    const view = getView(app);
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
    debugLog("getEditor(): 'view' does not have a property named 'editor'. Will return null.");
    return null;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function cloneObject<ObjectType extends Object>(object: ObjectType): ObjectType{
    return Object.assign({}, object) as ObjectType;
}

/**
 * Merges two or more objects together. If they have same property names, former objects' properties get overwritten by later objects' properties.
 *
 * @param objects
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function combineObjects(...objects: Object[]) {
    return Object.assign({}, ...objects);
}

export function mergeSets<SetType>(set1: Set<SetType>, set2: Set<SetType>): Set<SetType> {
    return new Set<SetType>([...set1, ...set2]);
}

/**
 * Returns a new Set cloned from 'from_set', with all items presented in 'remove' removed from it.
 *
 * @param from_set
 * @param remove Can be either a Set of removable items, or a single item.
 */
export function removeFromSet<SetType>(from_set: Set<SetType>, remove: Set<SetType> | SetType): Set<SetType> {
    const reduced_set = new Set(from_set);
    if (remove instanceof Set) {
        for (const removable of remove) {
            reduced_set.delete(removable);
        }
    } else {
        reduced_set.delete(remove);
    }
    return reduced_set;
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
    const leading_slashes_regexp = /^[/\\]*/gu; // Get as many / or \ slashes as there are in the very beginning of path. Can also be "" (an empty string).
    const leading_slashes_array = leading_slashes_regexp.exec(path); // An array with only one item.
    if (null === leading_slashes_array) {
        // It should always match. This exception should never happen, but have it just in case.
        throw new Error("normalizePath2(): leading_slashes_regexp did not match.");
    }
    let leading_slashes = leading_slashes_array[0];

    // 2. Run the original normalizePath()
    path = normalizePath(path);

    // 3. Fixes
    // Check that correct slashes are used.
    if (isWindows()) {
        // The platform is Windows.
        // Convert / to \
        path = path.replace(/\//gu, "\\"); // Need to use a regexp instead of a normal "/" -> "\\" replace because the normal replace would only replace first occurrence of /.
        leading_slashes = leading_slashes.replace(/\//gu, "\\"); // Same here.
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

export function extractFileName(file_path: string, with_extension = true) {
    if (with_extension) {
        return path.parse(file_path).base;
    } else {
        return path.parse(file_path).name;
    }
}

export function extractFileParentPath(file_path: string) {
    return path.parse(file_path).dir;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function joinObjectProperties(object: {}, glue: string) {
    let result = "";
    for (const property_name in object) {
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

/**
 * Opens a web browser in the specified URL.
 * @param url
 */
export function gotoURL(url: string) {
    shell.openExternal(url); // This returns a promise, but it can be ignored as there's nothing to do after opening the browser.
}

export function generateObsidianCommandName(plugin: SC_Plugin, shell_command: string, alias: string) {
    const prefix = plugin.settings.obsidian_command_palette_prefix;
    if (alias) {
        // If an alias is set for the command, Obsidian's command palette should display the alias text instead of the actual command.
        return prefix + alias;
    }
    return prefix + shell_command;
}

export function isInteger(value: string, allow_minus: boolean): boolean {
    if (allow_minus) {
        return !!value.match(/^-?\d+$/u);
    } else {
        return !!value.match(/^\d+$/u);
    }
}

/**
 * Translates 1-indexed caret line and column to a 0-indexed EditorPosition object. Also translates a possibly negative line
 * to a positive line from the end of the file, and a possibly negative column to a positive column from the end of the line.
 * @param editor
 * @param caret_line
 * @param caret_column
 */
export function prepareEditorPosition(editor: Editor, caret_line: number, caret_column: number): EditorPosition {
    // Determine line
    if (caret_line < 0) {
        // Negative line means to calculate it from the end of the file.
        caret_line = Math.max(0, editor.lastLine() + caret_line + 1);
    } else {
        // Positive line needs just a small adjustment.
        // Editor line is zero-indexed, line numbers are 1-indexed.
        caret_line -= 1;
    }

    // Determine column
    if (caret_column < 0) {
        // Negative column means to calculate it from the end of the line.
        caret_column = Math.max(0, editor.getLine(caret_line).length + caret_column + 1);
    } else {
        // Positive column needs just a small adjustment.
        // Editor column is zero-indexed, column numbers are 1-indexed.
        caret_column -= 1;
    }

    return {
        line: caret_line,
        ch: caret_column,
    };
}

export function getSelectionFromTextarea(textarea_element: HTMLTextAreaElement, return_null_if_empty: true): string | null;
export function getSelectionFromTextarea(textarea_element: HTMLTextAreaElement, return_null_if_empty: false): string;
export function getSelectionFromTextarea(textarea_element: HTMLTextAreaElement, return_null_if_empty: boolean): string | null {
    const selected_text = textarea_element.value.substring(textarea_element.selectionStart, textarea_element.selectionEnd);
    return "" === selected_text && return_null_if_empty ? null : selected_text;
}

/**
 * Creates an HTMLElement (with freely decidable tag) and adds the given content into it as normal text. No HTML formatting
 * is supported, i.e. possible HTML special characters are shown as-is. Newline characters are converted to <br> elements.
 *
 * @param tag
 * @param content
 * @param parent_element
 */
export function createMultilineTextElement(tag: keyof HTMLElementTagNameMap, content: string, parent_element: HTMLElement) {
    const content_element = parent_element.createEl(tag);

    // Insert content line-by-line
    const content_lines = content.split(/\r\n|\r|\n/g); // Don't use ( ) with | because .split() would then include the newline characters in the resulting array.
    content_lines.forEach((content_line: string, content_line_index: number) => {
        // Insert the line.
        content_element.insertAdjacentText("beforeend", content_line);

        // Insert a linebreak <br> if needed.
        if (content_line_index < content_lines.length - 1) {
            content_element.insertAdjacentHTML("beforeend", "<br>");
        }
    });
    return content_element;
}

export function randomInteger(min: number, max: number) {
    const range = max - min + 1;
    return min + Math.floor(Math.random() * range);
}

/**
 * Does the following prefixings:
 *   \ will become \\
 *   [ will become \[
 *   ] will become \]
 *   ( will become \(
 *   ) will become \)
 *
 * @param content
 */
export function escapeMarkdownLinkCharacters(content: string) {
    // TODO: \[ can be replaced with [ as eslint suggests and ten remove the ignore line below. I'm not doing it now because it would be outside of the scope of this commit/issue #70.
    // eslint-disable-next-line no-useless-escape
    return content.replace(/[\\()\[\]]/gu, "\\$&");
}

export function copyToClipboard(text: string): Promise<void> {
    return clipboard.writeText(text);
}

export async function getFileContentWithoutYAML(app: App, file: TFile): Promise<string> {
    return new Promise((resolve) => {
        // The logic is borrowed 2022-09-01 from https://forum.obsidian.md/t/how-to-get-current-file-content-without-yaml-frontmatter/26197/2
        // Thank you, endorama! <3
        const file_content = app.vault.read(file);
        file_content.then((file_content: string) => {
            const frontmatter_cache: FrontMatterCache | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
            if (frontmatter_cache) {
                // A YAML frontmatter is present in the file.
                const frontmatter_end_line_number = frontmatter_cache.position.end.line + 1; // + 1: Take the last --- line into account, too.
                const file_content_without_frontmatter: string = file_content.split("\n").slice(frontmatter_end_line_number).join("\n");
                return resolve(file_content_without_frontmatter);
            } else {
                // No YAML frontmatter is present in the file.
                // Return the whole file content, because there's nothing to remove.
                return resolve(file_content);
            }
        });
    });
}

export async function getFileYAML(app: App, file: TFile, withDashes: boolean): Promise<string | null> {
    return new Promise((resolve) => {
        // The logic is borrowed 2022-09-01 from https://forum.obsidian.md/t/how-to-get-current-file-content-without-yaml-frontmatter/26197/2
        // Thank you, endorama! <3
        const fileContent = app.vault.read(file);
        fileContent.then((file_content: string) => {
            const frontmatterCache: FrontMatterCache | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
            if (frontmatterCache) {
                // A YAML frontmatter is present in the file.
                const frontmatterEndLineNumber = frontmatterCache.position.end.line + 1; // + 1: Take the last --- line into account, too.
                let firstLine: number;
                let lastLine: number;
                if (withDashes) {
                    // Take full YAML content, including --- lines at the top and bottom.
                    firstLine = 0;
                    lastLine = frontmatterEndLineNumber;
                } else {
                    // Exclude --- lines.
                    firstLine = 1;
                    lastLine = frontmatterEndLineNumber-1;
                }
                const frontmatterContent: string = file_content.split("\n").slice(firstLine,lastLine).join("\n");
                return resolve(frontmatterContent);
            } else {
                // No YAML frontmatter is present in the file.
                return resolve(null);
            }
        });
    });
}