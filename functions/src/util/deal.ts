import {Special} from "../models/cards";

/**
 * Deal response cards from the card pool based on the {@link PromptCard.special}
 * @param pool the response card pool to deal from
 * @param special the prompt card special to determine the amount to deal
 */
export function dealResponses(pool: string[], special: Special | undefined): string[] {
    if (special === 'PICK 2') {
        return drawN(pool, 2)
    } else if (special === 'DRAW 2, PICK 3') {
        return drawN(pool, 3)
    } else {
        return drawN(pool, 1)
    }
}

/**
 * Draw a random card from the array
 * @param array the array to draw and modify from
 */
export function draw<T>(array: T[]): T {
    return array.splice(0, 1)[0];
}

/**
 * Draw N number of items off the array
 * @param array the array to draw and modify from
 * @param count the number of cards to draw off the top
 */
export function drawN<T>(array: T[], count: number): T[] {
    return array.splice(0, count);
}