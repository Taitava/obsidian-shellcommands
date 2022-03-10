
/**
 * Escapes a string that will be used as a pattern in a regular expression.
 *
 * Note that this does not escape minus: - . It's probably ok as long as you won't wrap the result of this function in square brackets [ ] . For more information, read a comment by coolaj86 on Nov 29, 2019 at 2:44 in this Stack Overflow answer: https://stackoverflow.com/a/6969486/2754026
 *
 * Copied 2022-03-10 from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
 * Modifications:
 *  - Added TypeScript data type hints for the parameter and return value.
 *  - Added 'export' keyword.
 *  - Added this JSDoc.
 *  - No other changes.
 *
 * @param string
 * @return string
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
