/*
 * 'Shell commands' plugin for Obsidian.
 * Copyright (C) 2021 - 2024 Jarkko Linnanvirta
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
    MarkdownView,
    normalizePath,
    Pos,
    setIcon,
    TFile,
} from "obsidian";
import { debugLog } from "src/Debug";

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

/**
 * Same as normalizePath(), but fixes these glitches:
 * - Leading forward slashes / backward slashes should not be removed.
 * - \ should not be converted to / if platform is Windows. In other words, / should be converted to \ if platform is Windows.
 *
 * TODO: I've opened a discussion about this on Obsidian's forums. If anything new comes up in the discussion, make changes accordingly. https://forum.obsidian.md/t/normalizepath-removes-a-leading/24713
 */
export function normalizePath2(path: string, convertSlashToBackslash: boolean) {
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
    if (convertSlashToBackslash) {
        // Convert / to \ (usually done when running on Windows, but might in theory happen on other platforms, too, if using a shell that uses Windows directory separators).
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

/**
 * Callout types were checked on 2023-12-20: https://help.obsidian.md/Editing+and+formatting/Callouts#Supported%20types
 */
type CalloutType = "note" | "abstract" | "info" | "todo" | "tip" | "success" | "question" | "warning" | "failure" | "danger" | "bug" | "example" | "quote";

const CalloutIcons = {
    note: "lucide-pencil",
    abstract: "lucide-clipboard-list",
    info: "lucide-info",
    todo: "lucide-check-circle-2",
    tip: "lucide-flame",
    success: "lucide-check",
    question: "lucide-help-circle",
    warning: "lucide-alert-triangle",
    failure: "lucide-x",
    danger: "lucide-zap",
    bug: "lucide-bug",
    example: "lucide-list",
    quote: "lucide-quote",
};

/**
 * Creates a <div> structure that imitates Obsidian's callouts like they appear on notes.
 *
 * The HTML structure is looked up on 2023-12-20 from this guide's screnshots: https://forum.obsidian.md/t/obsidian-css-quick-guide/58178#an-aside-on-classes-5
 * @param containerElement
 * @param calloutType
 * @param title
 * @param content
 */
export function createCallout(containerElement: HTMLElement, calloutType: CalloutType, title: DocumentFragment | string, content: DocumentFragment | string) {
    // Root.
    const calloutRoot: HTMLDivElement = containerElement.createDiv({cls: "callout"});
    calloutRoot.dataset.callout = calloutType;
    
    // Title.
    const calloutTitle: HTMLDivElement = calloutRoot.createDiv({cls: "callout-title"});
    const calloutTitleIcon: HTMLDivElement = calloutTitle.createDiv({cls: "callout-icon"});
    setIcon(calloutTitleIcon, CalloutIcons[calloutType as keyof typeof CalloutIcons]);
    const calloutTitleInner = calloutTitle.createDiv({cls: "callout-title-inner"});
    if (title instanceof DocumentFragment) {
        calloutTitleInner.appendChild(title);
    } else {
        calloutTitleInner.appendText(title);
    }
    
    // Content.
    const calloutContent: HTMLDivElement = calloutRoot.createDiv({cls: "callout-content"});
    if (content instanceof DocumentFragment) {
        calloutContent.appendChild(content);
    } else {
        calloutContent.createEl("p").appendText(content);
    }
}

export async function getFileContentWithoutYAML(app: App, file: TFile): Promise<string> {
    return new Promise((resolve) => {
        // The logic is borrowed 2022-09-01 from https://forum.obsidian.md/t/how-to-get-current-file-content-without-yaml-frontmatter/26197/2
        // Thank you, endorama! <3
        const file_content = app.vault.read(file);
        file_content.then((file_content: string) => {
            const frontmatterPosition: Pos | undefined = app.metadataCache.getFileCache(file)?.frontmatterPosition;
            if (frontmatterPosition) {
                // A YAML frontmatter is present in the file.
                const frontmatterEndLineNumber: number = frontmatterPosition.end.line + 1; // + 1: Take the last --- line into account, too.
                const file_content_without_frontmatter: string = file_content.split("\n").slice(frontmatterEndLineNumber).join("\n");
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
            const frontmatterPosition: Pos | undefined = app.metadataCache.getFileCache(file)?.frontmatterPosition;
            if (frontmatterPosition) {
                // A YAML frontmatter is present in the file.
                const frontmatterEndLineNumber: number = frontmatterPosition.end.line + 1; // + 1: Take the last --- line into account, too.
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