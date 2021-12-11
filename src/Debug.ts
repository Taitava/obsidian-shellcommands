
/**
 * If true, logging stuff to console.log() will be enabled.
 * Might also enable some testing {{variables}} in the future, perhaps.
 */
export let DEBUG_ON = false;

export function setDEBUG_ON(value: boolean) {
    DEBUG_ON = value;
}

/**
 * Calls console.log(), but only if debugging is enabled.
 * @param message
 */
export function debugLog(message: string) {
    if (DEBUG_ON) {
        console.log(message);
    }
}