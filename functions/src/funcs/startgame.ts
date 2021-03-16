import {CallableContext} from "firebase-functions/lib/providers/https";
import * as firebase from '../firebase/firebase';
import {CardSet, getSpecial} from "../models/cards";
import {cut, shuffle} from "../util/shuffle";
import {dealResponses, draw, drawN} from "../util/deal";
import {Turn} from "../models/turn";
import {Player, RANDO_CARDRISSIAN} from "../models/player";
import {flatMap} from "../util/flatmap";
import {error} from "../util/error";
import {GameCardPool} from "../models/pool";
import {Game} from "../models/game";

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
            const game = await firebase.games.getGame(gameId);
            if (game?.state === 'waitingRoom') {
                game.id = gameId;
                // Game exists and is in the appropriate state. Now we will seed the card pull
                const players = await firebase.games.getPlayers(gameId);
                if (players && players.length > 2) {
                    // Okay, enough players are in this game, now seed it
                    const cardSets = await firebase.cards.getCardSet(...game.cardSets);
                    if (cardSets.length > 0) {

                        // Update the state to 'starting' so the clients reflect this state appropriately
                        await firebase.games.updateState(gameId, 'starting');

                        // combine and shuffle all prompt cards
                        const promptCardIndexes = combineAndShuffleIndexes(cardSets, (set) => set.promptIndexes ?? []);
                        const responseCardIndexes = combineAndShuffleIndexes(cardSets, (set) => set.responseIndexes ?? []);

                        // const promptCards = pickRandomCountFromArray(promptCardIndexes, promptCardSeedCount(players.length));
                        // const responseCards = pickRandomCountFromArray(responseCardIndexes, responseCardSeedCount(players.length, game.prizesToWin));

                        const promptCards = drawN(promptCardIndexes, promptCardSeedCount(players.length));
                        const responseCards = drawN(responseCardIndexes, responseCardSeedCount(players.length, game.prizesToWin));
                        const cardPool: GameCardPool = { prompts: promptCards, responses: responseCards };

                        // Deal 10 cards to every player, except Rando Cardrissian
                        await dealPlayersIn(gameId, players, cardPool);

                        /*
                         * Generate the turn
                         */
                        const firstTurn = await generateFirstTurn(game, players, cardPool);

                        /*
                         * Seed Card Pool
                         */
                        await firebase.games.seedCardPool(gameId, cardPool.prompts, cardPool.responses);
                        console.log(`The Game(${gameId}) has now been seeded with ${cardPool.prompts.length} Prompt cards and ${cardPool.responses.length} Response cards`);

                        /*
                         * Game, Set & Match
                         */

                        // Now that we have dealt in every player, set judging rotation, setup first turn, and seeded
                        // the card pool it's now time to update the card's set to 'inProgress'
                        await firebase.games.updateState(gameId, 'inProgress', players);

                        // Send push notification to participants
                        await firebase.push.sendGameStartedMessage(game, players, firstTurn);

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
async function dealPlayersIn(gameId: string, players: Player[], cardPool: GameCardPool): Promise<void> {
    // Deal 10 cards to every player, except Rando Cardrissian
    for (const player of players) {
        if (!player.isRandoCardrissian) {
            // Draw and fetch hand
            const handIndexes = drawN(cardPool.responses, 10);
            const hand = await firebase.cards.getResponseCards(handIndexes);

            // Update player's hand in firebase
            await firebase.players.setHand(gameId, player.id, hand);

            console.log(`Hand dealt for ${player.name}`);
        } else {
            console.log('Rando Cardrissian doesn\'t play by the rules so he doesn\'t need a hand')
        }
    }
}

/**
 * Generate the first turn of the game
 * @param game the id of the game
 * @param players the list of players participating in this game
 * @param cardPool the pool of cards to draw from
 */
async function generateFirstTurn(
    game: Game,
    players: Player[],
    cardPool: GameCardPool
): Promise<Turn> {
    const judgeOrder = players
        .filter((p) => !p.isRandoCardrissian)
        .map((p) => p.id);
    shuffle(judgeOrder);

    // Draw the prompt card
    const promptIndex = draw(cardPool.prompts);
    let promptCard = await firebase.cards.getPromptCard(promptIndex);
    if (game.pick2Enabled === false || game.draw2Pick3Enabled === false) {
        while ((getSpecial(promptCard.special) === 'PICK 2' && game.pick2Enabled === false) ||
            (getSpecial(promptCard.special) === 'DRAW 2, PICK 3' && game.draw2Pick3Enabled === false)) {
            console.log(`Re-drawing prompt card because player has placed restrictions`);
            promptCard = await firebase.cards.getPromptCard(draw(cardPool.prompts))
        }
    }

    // Create and save the turn
    const turn: Turn = {
        judgeId: judgeOrder[0],
        promptCard: promptCard,
        responses: {},
    };

    // Go ahead and set Rando Cardrissian's response if he is a part of this game
    if (players.find((p) => p.isRandoCardrissian)) {
        const randoResponseCardIndexes = dealResponses(cardPool.responses, getSpecial(promptCard.special));
        turn.responses[RANDO_CARDRISSIAN] = await firebase.cards.getResponseCards(randoResponseCardIndexes);
        console.log("Rando Cardrissian has been dealt into the first turn")
    }

    await firebase.games.update(game.id, {
        turn: turn,
        judgeRotation: judgeOrder
    });
    console.log("Judging rotation is now set");
    console.log(`The first turn is now set for ${game.id}`);

    return turn;
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
    const cutResponses = cut(allResponses);
    shuffle(cutResponses);
    shuffle(cutResponses);
    return cutResponses;
}

/**
 * Return the number of {@link PromptCard}s to seed a game with based on the number of players that are in the game.
 * This will return 100 at a minimum
 * @param numPlayers the number of players that are in the game
 */
function promptCardSeedCount(numPlayers: number): number {
    return Math.max(
        numPlayers * 12,
        200
    )
}

/**
 * Return the number of {@link ResponseCard}s to seed a game with based of the number of players that are in the game.
 * This will return 200 at a minimum
 * @param numPlayers the number of players that are in the game
 */
function responseCardSeedCount(numPlayers: number, prizesToWin: number): number {
    const count = (numPlayers * 10) /* To account for initial deal */ +
        (numPlayers * prizesToWin * numPlayers) + /* To account for drawing cards */
        (numPlayers * 10); /* To account for re-deals */
    return Math.max(count, 200);
}