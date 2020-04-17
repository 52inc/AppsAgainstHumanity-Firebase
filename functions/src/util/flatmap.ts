/**
 * Perform a 'flatMap' operation since we can't apparently use 'es2019' in Firebase Functions
 * @param array the array of items we want to flat map
 * @param selector the selector to pull the sub-array of items out of each item to flatten
 */
export function flatMap<T, R>(array: T[], selector: (item: T) => R[]): R[] {
    return Array.prototype.concat(...array.map(selector));
}