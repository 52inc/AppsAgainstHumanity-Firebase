import * as functions from 'firebase-functions';
import {CallableContext, FunctionsErrorCode} from "firebase-functions/lib/providers/https";
import * as firestore from '../firestore/firestore';
import {CardSet, getSpecial, ResponseCard} from "../models/cards";
import {shuffle} from "../util/shuffle";
import {dealResponses, draw, pickRandomCountFromArray} from "../util/deal";
import {Turn} from "../models/turn";
import {Player, RANDO_CARDRISSIAN} from "../models/player";
import {flatMap} from "../util/flatmap";

type CardPool = {
    prompts: string[];
    responses: string[];
}

/**
 * Start Game - [Callable Function]
 * This function serves to start a game that is in the 'waitingRoom' state by:
 *
 * 1. Populate card pool
 * 2. Generated first turn
 * 3. Deal cards to players
 * 4. Update GameState => 'inProgress'
 */
export async function handleStartGame(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gameId = data.game_id;

    if (uid) {
        if (gameId) {
            // Load the game for this gameId and verify that it is in the correct state
            const game = await firestore.games.getGame(gameId);
            if (game?.state === 'waitingRoom') {
                // Game exists and is in the appropriate state. Now we will seed the card pull
                const players = await firestore.games.getPlayers(gameId);
                if (players && players.length > 1) {
                    // Okay, enough players are in this game, now seed it
                    const cardSets = await firestore.cards.getCardSet(...game.cardSets);
                    if (cardSets.length > 0) {
                        // combine and shuffle all prompt cards
                        const promptCardIndexes = combineAndShuffleIndexes(cardSets, (set) => set.promptIndexes);
                        const responseCardIndexes = combineAndShuffleIndexes(cardSets, (set) => set.responseIndexes);
                        const promptCards = pickRandomCountFromArray(promptCardIndexes, promptCardSeedCount(players.length));
                        const responseCards = pickRandomCountFromArray(responseCardIndexes, responseCardSeedCount(players.length));
                        const cardPool: CardPool = { prompts: promptCards, responses: responseCards };

                        // Deal 10 cards to every player, except Rando Cardrissian
                        await dealPlayersIn(gameId, players, cardPool);

                        /*
                         * Generate the turn
                         */

                        await generateFirstTurn(gameId, players, cardPool);

                        /*
                         * Seed Card Pool
                         */

                        // Persist what remains of the card pool the games pool of cards
                        await firestore.games.seedCardPool(gameId, promptCardIndexes, responseCardIndexes);
                        console.log(`The Game(${gameId}) has now been seeded with ${promptCardIndexes.length} Prompt cards and ${responseCardIndexes.length} Response cards`);

                        /*
                         * Game, Set & Match
                         */

                        // Now that we have dealt in every player, set judging rotation, setup first turn, and seeded
                        // the card pool it's now time to update the card's set to 'inProgress'
                        await firestore.games.updateState(gameId, 'inProgress');

                        // FINISH! Return some arbitrary result that the app won't deal with.
                        return {
                            game_id: gameId,
                            success: true,
                        }
                    } else {
                        error('failed-precondition', 'This game was setup with an invalid number of card sets')
                    }
                } else {
                    error('failed-precondition',
                        'There aren\'t enough players in this game to start, try inviting Rando Cardrissian.')
                }
            } else {
                error('not-found',
                    `Unable to find a game for ${gameId}, or game is not in the waiting room`)
            }
        } else {
            error("invalid-argument", 'The function must be called with a valid "game_id".');
        }
    } else {
        // Throw error
        error('failed-precondition', 'The function must be called while authenticated.');
    }
}

/**
 * Deal player's into the game
 * @param gameId the id of the game
 * @param players the list of participating players in this game
 * @param cardPool the pool of cards to deal from
 */
async function dealPlayersIn(gameId: string, players: Player[], cardPool: CardPool): Promise<void> {
    // Deal 10 cards to every player, except Rando Cardrissian
    for (const player of players) {
        if (!player.isRandoCardrissian) {
            // Draw and fetch hand
            const handIndexes = pickRandomCountFromArray(cardPool.responses, 10);
            const hand = await firestore.cards.getResponseCards(handIndexes);

            // Update player's hand in firestore
            await firestore.players.setHand(gameId, player.id, hand);

            console.log(`Hand dealt for ${player.name}`);
        } else {
            console.log('Rando Cardrissian doesn\'t play by the rules so he doesn\'t need a hand')
        }
    }
}

/**
 * Generate the first turn of the game
 * @param gameId the id of the game
 * @param players the list of players participating in this game
 * @param cardPool the pool of cards to draw from
 */
async function generateFirstTurn(gameId: string, players: Player[], cardPool: CardPool): Promise<void> {
    const judgeOrder = players
        .filter((p) => !p.isRandoCardrissian)
        .map((p) => p.id);
    shuffle(judgeOrder);
    await firestore.games.setJudgeRotation(gameId, judgeOrder);
    console.log("Judging rotation is now set");

    // Draw the prompt card
    const promptIndex = draw(cardPool.prompts);
    const promptCard = await firestore.cards.getPromptCard(promptIndex);

    // Create and save the turn
    const turn: Turn = {
        judgeId: judgeOrder[0],
        promptCard: promptCard,
        responses: new Map<string, ResponseCard[]>(),
    };

    // Go ahead and set Rando Cardrissian's response if he is a part of this game
    if (players.find((p) => p.isRandoCardrissian)) {
        const randoResponseCardIndexes = dealResponses(cardPool.responses, getSpecial(promptCard.special));
        turn.responses.set(RANDO_CARDRISSIAN, await firestore.cards.getResponseCards(randoResponseCardIndexes));
        console.log("Rando Cardrissian has been dealt into the first turn")
    }

    await firestore.games.setTurn(gameId, turn);
    console.log(`The first turn is now set for ${gameId}`);
}

/**
 * Combine and shuffle all the indexes from an array of CardSet's as determined by the {selector}
 * @see {@link shuffle}
 * @param cardSets the array of {@link CardSet} to process
 * @param selector the selector to pick which array of indexexs from the set you want
 */
function combineAndShuffleIndexes(cardSets: CardSet[], selector: (set: CardSet) => string[]): string[] {
    const allResponses = flatMap(cardSets, selector);
    shuffle(allResponses);
    shuffle(allResponses);
    shuffle(allResponses);
    return allResponses;
}

/**
 * Return the number of {@link PromptCard}s to seed a game with based on the number of players that are in the game.
 * This will return 100 at a minimum
 * @param numPlayers the number of players that are in the game
 */
function promptCardSeedCount(numPlayers: number): number {
    return Math.max(
        numPlayers * 10,
        100
    )
}

/**
 * Return the number of {@link ResponseCard}s to seed a game with based of the number of players that are in the game.
 * This will return 200 at a minimum
 * @param numPlayers the number of players that are in the game
 */
function responseCardSeedCount(numPlayers: number): number {
    const count = (numPlayers * 10) /* To account for initial deal */ +
        (numPlayers * 9) + /* To account for drawing cards */
        (numPlayers * 20); /* To account for re-deals */
    return Math.max(count, 200);
}

function error(code: FunctionsErrorCode, message: string): never {
    throw new functions.https.HttpsError(code, message);
}