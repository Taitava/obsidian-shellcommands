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

// THIS FILE IS MEANT FOR FUNCTIONS THAT DO NOT NEED TO IMPORT ANYTHING FROM ANYWHERE. NO IMPORTS ARE ALLOWED HERE!

export function cloneObject<ObjectType extends object>(object: ObjectType): ObjectType{
    return Object.assign({}, object) as ObjectType;
}

/**
 * Merges two or more objects together. If they have same property names, former objects' properties get overwritten by later objects' properties.
 *
 * @param objects
 */
export function combineObjects(...objects: object[]) {
    return Object.assign({}, ...objects);
}

/**
 * Compares two objects deeply for equality.
 *
 * Copied 2023-12-30 from https://dmitripavlutin.com/how-to-compare-objects-in-javascript/#4-deep-equality
 * Modifications:
 *  - Added types to the function parameters and return value.
 *  - Changed `const val1 = object1[key];` to `const val1 = (object1 as {[key: string]: unknown})[key];`, and the same for val2.
 *  - Added a possibility to compare other values than objects, too.
 *
 * @param {unknown} object1 - The first object to compare.
 * @param {unknown} object2 - The second object to compare.
 * @return {boolean} - Returns `true` if the objects are deeply equal, `false` otherwise.
 * @author Original author: Dmitri Pavlutin
 */

export function deepEqual(object1: unknown, object2: unknown): boolean {
    if (!isObject(object1) || !isObject(object2)) {
        // If any of the parameters are not objects, do a simple comparison.
        return object1 === object2;
    }
    
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    
    if (keys1.length !== keys2.length) {
        return false;
    }
    
    for (const key of keys1) {
        const val1 = (object1 as {[key: string]: unknown})[key];
        const val2 = (object2 as {[key: string]: unknown})[key];
        const areObjects = isObject(val1) && isObject(val2);
        if (
            areObjects && !deepEqual(val1, val2) ||
            !areObjects && val1 !== val2
        ) {
            return false;
        }
    }
    
    return true;
}

/**
 * Copied 2023-12-30 from https://dmitripavlutin.com/how-to-compare-objects-in-javascript/#4-deep-equality
 * Modifications:
 *  - Added types to the function parameter and return value.
 *
 * Can be exported later, if needed elsewhere.
 *
 * @param object
 * @author Original author: Dmitri Pavlutin
 */
function isObject(object: unknown): object is object {
    return object != null && typeof object === 'object';
}

/**
 * Gets the surplus properties from an object that are not present in another object.
 * @param {object} surplusObject - The object to check for surplus properties.
 * @param {object} comparisonObject - The object to compare against.
 * @return {object} - An object containing the surplus properties found in surplusObject that are not present in comparisonObject.
 */
export function getObjectSurplusProperties(surplusObject: object, comparisonObject: object): Partial<typeof surplusObject> {
    const surplusProperties: {[key: string]: unknown} = {};
    for (const key of Object.getOwnPropertyNames(surplusObject)) {
        if (!comparisonObject.hasOwnProperty(key)) {
            surplusProperties[key] = (surplusObject as {[key: string]: unknown})[key];
        }
    }
    return surplusProperties;
}

/**
 * Assigns properties from defaultObject to targetObject, if they don't exist yet in the target. Existing properties are
 * NOT overridden.
 *
 * This can be thought of as merging two objects together, but inline, as opposed to combineObjects(), which creates a
 * new object.
 *
 * @param targetObject
 * @param defaultObject
 */
export function ensureObjectHasProperties(targetObject: object, defaultObject: object) {
    for (const defaultPropertyName of Object.getOwnPropertyNames(defaultObject) as (keyof typeof defaultObject)[]) {
        if (undefined === targetObject[defaultPropertyName]) {
            // A property does not exist on targetObject. Create it, and use a value from defaultObject.
            targetObject[defaultPropertyName] = defaultObject[defaultPropertyName];
        }
    }
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

export function joinObjectProperties(object: object, glue: string) {
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
export function uniqueArray<Type>(array: Type[]): Type[] {
    return [...new Set(array)];
}

export function isInteger(value: string, allow_minus: boolean): boolean {
    if (allow_minus) {
        return !!value.match(/^-?\d+$/u);
    } else {
        return !!value.match(/^\d+$/u);
    }
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

export function cloakPassword(password: string): string {
    return "&bull;".repeat(password.length);
}

/**
 * Tries to provide a simple try...catch interface that rethrows unrecognised exceptions on your behalf.
 * @param act Try to do this. If it succeeds, tryTo() returns what act() returns, and does not touch the other arguments.
 * @param fix An exception handler that gets called if act() throws an exception that matches any one in bust. The function receives the caught exception as a parameter.
 * @param bust An array of Error classes that can be caught. Any other exceptions will be rethrown.
 */
export function tryTo<returnType>(
    act: () => returnType,
    fix: (exception: Error) => returnType,
    ...bust: Error["constructor"][]
): returnType {
    try {
        // Try to do stuff and see if an exception occurs.
        return act();
    } catch (exception) {
        // An exception has happened. Check if it's included in the list of handleable exceptions.
        const canCatch: boolean = bust.filter(catchable => exception instanceof catchable.constructor).length > 0;
        if (canCatch) {
            // This exception can be handled.
            return fix(exception);
        } else {
            // This exception cannot be handled. Rethrow it.
            throw exception;
        }
    }
}