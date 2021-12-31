import {getVaultAbsolutePath, normalizePath2} from "../Common";
import {App, TFile, TFolder} from "obsidian";

/**
 * TODO: Consider creating a decorator class for TFolder and moving this function to be a method in it.
 *
 * @param app
 * @param folder
 * @param mode
 */
export function getFolderPath(app: App, folder: TFolder, mode: "absolute" | "relative") {
    switch (mode.toLowerCase()) {
        case "absolute":
            return normalizePath2(getVaultAbsolutePath(app) + "/" + folder.path);
        case "relative":
            if (folder.isRoot()) {
                // Obsidian API does not give a correct folder.path value for the vault's root folder.
                // TODO: See this discussion and apply possible changes if something will come up: https://forum.obsidian.md/t/vault-root-folders-relative-path-gives/24857
                return ".";
            } else {
                // This is a normal subfolder
                return normalizePath2(folder.path); // Normalize to get a correct slash between directories depending on platform. On Windows it should be \ .
            }
    }
}

/**
 * TODO: Consider creating a decorator class for TFile and moving this function to be a method in it.
 *
 * @param app
 * @param file
 * @param mode
 */
export function getFilePath(app: App, file: TFile, mode: "absolute" | "relative") {
    switch (mode.toLowerCase()) {
        case "absolute":
            return normalizePath2(getVaultAbsolutePath(app) + "/" + file.path);
        case "relative":
            return normalizePath2(file.path); // Normalize to get a correct slash depending on platform. On Windows it should be \ .
    }
}


/**
 * TODO: Consider creating a decorator class for TFile and moving this function to be a method in it.
 * @param file
 * @param with_dot
 */
export function getFileExtension(file: TFile, with_dot: boolean) {
    const file_extension = file.extension;

    // Should the extension be given with or without a dot?
    if (with_dot) {
        // A preceding dot must be included.
        if (file_extension.length > 0) {
            // But only if the extension is not empty.
            return "." + file_extension;
        }
    }

    // No dot should be included, or the extension is empty
    return file_extension;
}