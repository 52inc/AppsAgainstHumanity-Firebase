import {Special} from "../models/cards";

/**
 * Deal response cards from the card pool based on the {@link PromptCard.special}
 * @param pool the response card pool to deal from
 * @param special the prompt card special to determine the amount to deal
 */
export function dealResponses(pool: string[], special: Special | undefined): string[] {
    if (special === 'PICK 2') {
        return pickRandomCountFromArray(pool, 2)
    } else if (special === 'DRAW 2, PICK 3') {
        return pickRandomCountFromArray(pool, 3)
    } else {
        return [draw(pool)]
    }
}

/**
 * pick a random {count} from an array of elements with non-duplication
 * @param array the array of elements to pick from
 * @param count the number of elements to pick
 */
export function pickRandomCountFromArray<T>(array: T[], count: number): T[] {
    const items: T[] = [];
    const amount = Math.min(array.length, count);
    for (let i = 0; i < amount; i++) {
        items.push(draw(array)); // Remove the item from the array
    }
    return items;
}

/**
 * Draw a count of cards off the "top" of an array
 * @param array
 * @param count
 */
export function drawCount<T>(array: T[], count: number): T[] {
    const cards: T[] = [];
    for (let i=0; i<count; i++) {
        const item = array.pop();
        if (item) cards.push(item);
    }
    return cards;
}

/**
 * Draw a random card from the array
 * @param array the array to draw and modify from
 */
export function draw<T>(array: T[]): T {
    const index = Math.floor(Math.random() * array.length);
    return array.splice(index, 1)[0];
}