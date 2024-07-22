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

import {getVaultAbsolutePath, uniqueArray} from "../Common";
import {App, getAllTags, TFile, TFolder} from "obsidian";
import {Shell} from "../shells/Shell";

/**
 * TODO: Consider creating a decorator class for TFolder and moving this function to be a method in it.
 *
 * @param app
 * @param shell
 * @param folder
 * @param mode
 */
export function getFolderPath(app: App, shell: Shell, folder: TFolder, mode: "absolute" | "relative") {
    switch (mode.toLowerCase() as "absolute" | "relative") {
        case "absolute":
            return shell.translateAbsolutePath(getVaultAbsolutePath(app) + "/" + folder.path);
        case "relative":
            if (folder.isRoot()) {
                // Obsidian API does not give a correct folder.path value for the vault's root folder.
                // TODO: See this discussion and apply possible changes if something will come up: https://forum.obsidian.md/t/vault-root-folders-relative-path-gives/24857
                return ".";
            } else {
                // This is a normal subfolder
                return shell.translateRelativePath(folder.path);
            }
    }
}

/**
 * TODO: Consider creating a decorator class for TFile and moving this function to be a method in it.
 *
 * @param app
 * @param shell
 * @param file
 * @param mode
 */
export function getFilePath(app: App, shell: Shell, file: TFile, mode: "absolute" | "relative") {
    switch (mode.toLowerCase() as "absolute" | "relative") {
        case "absolute":
            return shell.translateAbsolutePath(getVaultAbsolutePath(app) + "/" + file.path);
        case "relative":
            return shell.translateRelativePath(file.path);
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

export function getFileTags(app: App, file: TFile) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) {
        throw new Error("Could not get metadata cache.");
    }

    // Get tags. May include duplicates, if a tag is defined multiple times in the same file.
    const tagsIncludingDuplicates: string[] = getAllTags(cache) ?? []; // ?? [] = in case null is returned, convert it to an empty array. I have no clue in which situation this might happen. Maybe if the file does not contain any tags?

    // Iron out possible duplicates.
    const tagsWithoutDuplicates: string[] = uniqueArray(tagsIncludingDuplicates);

    // Remove preceding hash characters. E.g. #tag becomes tag
    tagsWithoutDuplicates.forEach((tag: string, index) => {
        tagsWithoutDuplicates[index] = tag.replace("#", "");
    });
    return tagsWithoutDuplicates;
}

/**
 * @param app
 * @param file
 * @param property_path
 * @return string|string[] Either a result string, or an array of error messages.
 */
export function getFileYAMLValue(app: App, file: TFile, property_path: string) {
    const error_messages: string[] = [];
    const property_parts = property_path.split(".");

    // Validate all property names along the path
    property_parts.forEach((property_name: string) => {
        if (0 === property_name.length) {
            error_messages.push("YAML property '" + property_path + "' has an empty property name. Remove possible double dots or a preceding/trailing dot.");
        }
    });
    if (error_messages.length > 0) {
        // Failure in property name(s).
        return error_messages;
    }

    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    // Check that a YAML section is available in the file
    if (undefined === frontmatter) {
        // No it ain't.
        error_messages.push("No YAML frontmatter section is defined for the current file.");
        return error_messages;
    } else {
        // A YAML section is available.
        // Read the property's value.
        return nested_read(property_parts, property_path, frontmatter);
    }

    /**
     * @param property_parts Property path split into parts (= property names). The deeper the nesting goes, the fewer values will be left in this array. This should always contain at least one part! If not, an Error is thrown.
     * @param property_path The original, whole property path string.
     * @param yaml_object
     * @return string|string[] Either a result string, or an array of error messages.
     */
    function nested_read(property_parts: string[], property_path: string, yaml_object: { [key: string]: string | number | object }): string | string[] {
        // Check that property_parts contains at least one part.
        if (property_parts.length === 0) {
            throw new Error("No more property parts to read!");
        }
        let property_name: string = property_parts.shift() as string; // as string: Tell TypeScript that the result is not undefined, because the array is not empty.

        // Check if the property name is a negative numeric index.
        if (property_name.match(/^-\d+$/u)) {
            // The property name is a negative number.
            // Check that yaml_object contains at least one element.
            const yaml_object_keys = Object.getOwnPropertyNames(yaml_object).filter(key => key !== "length"); // All _really custom_ yaml keys, not .length
            if (yaml_object_keys.length > 0) {
                // Check if yaml_object happens to be an indexed list.
                let is_indexed_list = true;
                yaml_object_keys.forEach((key) => {
                    if (!key.match(/^\d+$/u)) {
                        // At least one non-numeric key was found, so consider the object not to be an indexed list.
                        is_indexed_list = false;
                    }
                });
                if (is_indexed_list) {
                    // The object is an indexed list and property_name is a negative index number.
                    // Translate property_name to a positive index from the end of the list.
                    property_name = Math.max(0, // If a greatly negative index is used (e.g. -999), don't allow the new index to be negative again.
                        yaml_object_keys.length
                        + parseInt(property_name) // Although + is used, this will be a subtraction, because property_name is prefixed with a minus.
                    ).toString();
                }
            }
        }

        // Get a value
        const property_value = yaml_object[property_name];

        // Check if the value is either: not found, object, or literal.
        if (undefined === property_value) {
            // Property was not found.
            error_messages.push("YAML property '" + property_name + "' is not found.");
            return error_messages;
        } else if (null === property_value) {
            // Property is found, but has an empty value. Example:
            //   ---
            //   itemA: valueA
            //   itemB:
            //   itemC: valueC
            //   ---
            // Here `itemB` would have a null value.
            error_messages.push("YAML property '" + property_name + "' has a null value. Make sure the property is not accidentally left empty.");
            return error_messages;
        } else if ("object" === typeof property_value) {
            // The value is an object.
            // Check if we have still dot notation parts left in the property path.
            if (0 === property_parts.length) {
                // No dot notation parts are left.
                const maybeJoinedStrings = joinStringsIfArray(property_value);
                if (null !== maybeJoinedStrings) {
                    // The object was an array of strings. Join them together.
                    return maybeJoinedStrings;
                }
                // Freak out.
                const nested_elements_keys = Object.getOwnPropertyNames(property_value);
                if (nested_elements_keys.length > 0) {
                    error_messages.push("YAML property '" + property_name + "' contains a nested element with keys: " + nested_elements_keys.join(", ") + ". Use e.g. '" + property_path + "." + nested_elements_keys[0] + "' to get its value.");
                } else {
                    error_messages.push("YAML property '" + property_name + "' contains a nested element. Use a property name that points to a literal value instead.");
                }
                return error_messages;
            } else {
                // Dot notation path still has another property name left, so continue the hunt.
                return nested_read(property_parts, property_path, property_value as { [key: string]: string | number | object });
            }
        } else {
            // The value is literal, i.e. a string or number.
            if (property_parts.length > 0) {
                error_messages.push("YAML property '" + property_name + "' gives already a literal value '" + property_value.toString() + "', but the argument '" + property_path + "' assumes the property would contain a nested element with the key '" + property_parts[0] + "'.");
                return error_messages;
            } else {
                return property_value.toString();
            }
        }
    }

}

function isArrayOfStrings(object: unknown): object is string[] {
    return Array.isArray(object) && object.every(item => typeof item === 'string');
}

function joinStringsIfArray(obj: any): string | null {
    if (isArrayOfStrings(obj)) {
        return obj.join(' ');
    } else {
        return null;
    }
}
