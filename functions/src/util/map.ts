/**
 * Map the values of one map to another
 * @param map
 * @param mapper
 */
export async function asyncMapValues<Key, V, R>(map: Map<Key, V>, mapper: (value: V) => Promise<R>): Promise<Map<Key, R>> {
    const newMap = new Map<Key, R>();
    for (const [key, value] of map.entries()) {
        newMap.set(key, await mapper(value))
    }
    return newMap;
}