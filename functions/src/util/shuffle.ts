/**
 * Shuffle an array using the Knuth-Fisher-Yates shuffle algorithm.
 * @see https://github.com/Daplie/knuth-shuffle
 * @param array the input array to shuffle
 */
export function shuffle<T>(array: T[]) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
}