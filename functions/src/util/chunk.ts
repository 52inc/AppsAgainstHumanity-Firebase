/**
 * Chunk an array into an array of arrays as defined by the input size
 * @param array the array to chunk
 * @param size the size of each chunk
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        const chunk = array.slice(i, i + size);
        result.push(chunk)
    }
    return result
}