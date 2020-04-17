export declare type Special = 'PICK 2' | 'DRAW 2, PICK 3'

export type PromptCard = {
    cid: string,
    text: string;
    special: string;
    set: string;
    source: string;
}

export type ResponseCard = {
    cid: string,
    text: string;
    set: string;
    source: string;
}

export type CardSet = {
    name: string;
    prompts: number;
    promptIndexes: string[];
    responses: number;
    responseIndexes: string[];
}

/**
 * Get a type-ified version of the special text from a prompt card
 * @param text the special text to compare and return
 */
export function getSpecial(text: string|undefined|null): Special | undefined {
    if (text) {
        if (text.toUpperCase() === 'PICK 2') {
            return 'PICK 2'
        } else if (text.toUpperCase() === 'DRAW 2 PICK 3' || text.toUpperCase() === 'DRAW 2, PICK 3') {
            return 'DRAW 2, PICK 3'
        }
    }

    return undefined
}