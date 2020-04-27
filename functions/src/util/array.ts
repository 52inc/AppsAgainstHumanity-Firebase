export function all<T>(array: T[], predicate: (value: T) => boolean): boolean {
    for (const value of array) {
        if (!predicate(value)) {
            return false;
        }
    }
    return true;
}

export function none<T>(array: T[], predicate: (value: T) => boolean): boolean {
    for (const value of array) {
        if (predicate(value)) {
            return false;
        }
    }
    return true;
}

export function any<T>(array: T[], predicate: (value: T) => boolean): boolean {
    for (const value of array) {
        if (predicate(value)) {
            return true;
        }
    }
    return false;
}