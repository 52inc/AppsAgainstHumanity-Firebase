/**
 * Shuffle an array using the Knuth-Fisher-Yates shuffle algorithm.
 * @see https://github.com/Daplie/knuth-shuffle
 * @param array the input array to shuffle
 */
export function shuffle<T>(array: T[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * "Cut" an array by splitting it in 2 and rejoining the halfs but inversed
 * @param array the array to "Cut" and reform
 * @param cutVariance Optional. The variance of where the cut takes place towards the center of the deck
 * @return the new cut deck. Note. This does not modify the original array
 */
export function cut<T>(array: T[], cutVariance: number = 10): T[] {
    const cv = Math.min(array.length, cutVariance);
    const cutPos = Math.floor(Math.random() * cv) + ((array.length - cv) / 2);
    const bottom = array.slice(0, cutPos);
    const top = array.slice(cutPos);
    return top.concat(bottom);
}