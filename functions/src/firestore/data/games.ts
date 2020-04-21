import {
    COLLECTION_CARD_POOL,
    COLLECTION_GAMES,
    COLLECTION_PLAYERS, COLLECTION_USERS,
    DOCUMENT_PROMPTS,
    DOCUMENT_RESPONSES
} from '../constants';
import {Game, GameState} from "../../models/game";
import {Player, RANDO_CARDRISSIAN} from "../../models/player";
import {Turn} from "../../models/turn";
import {cards, firestore} from "../firestore";
import {PromptCard, ResponseCard} from "../../models/cards";
import {CardPool} from "../../models/pool";
import {draw, pickRandomCountFromArray} from "../../util/deal";
import * as admin from "firebase-admin";
import FieldValue = admin.firestore.FieldValue;

/**
 * Fetch a {@link Game} object by it's {gameId}
 * @param gameId the document id of the game to pull
 */
export async function getGame(gameId: string): Promise<Game | undefined> {
    const gameDocSnapshot = await firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .get();

    const game = gameDocSnapshot.data() as Game;
    game.id = gameDocSnapshot.id;
    return game;
}

/**
 * Fetch all the {@link Player}s for a {@link Game} by the {gameId}
 * @param gameId the id of the game to get all the players for
 */
export async function getPlayers(gameId: string): Promise<Player[] | undefined> {
    const playerCollection = await firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS);

    const playersSnapshot = await playerCollection.get();
    return playersSnapshot.docs.map((snapshot) => snapshot.data() as Player);
}

/**
 * Draw a new prompt card from the game pool by removing it
 * @param gameId the game id to draw from
 * @return a {@link Promise} of the {@link PromptCard}
 */
export async function drawPromptCard(gameId: string): Promise<PromptCard> {
    const promptCardPool = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_CARD_POOL)
        .doc(DOCUMENT_PROMPTS);

    const prompts = await promptCardPool.get();
    const promptPool = prompts.data() as CardPool;
    const promptCardIndex = draw(promptPool.cards);

    // Now save the pool of cards
    await promptCardPool.update(promptPool);

    // now fetch the actual prompt card
    return cards.getPromptCard(promptCardIndex);
}

/**
 * Draw a {@param count} of cards from the game's response card pool
 * @param gameId the id of the game to pull from
 * @param count the number of response cards to draw
 */
export async function drawResponseCards(gameId: string, count: number): Promise<ResponseCard[]> {
    const responseCardPool = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_CARD_POOL)
        .doc(DOCUMENT_RESPONSES);

    const responses = await responseCardPool.get();
    const responsePool = responses.data() as CardPool;
    const responseCardIndexes = pickRandomCountFromArray(responsePool.cards, count);

    await responseCardPool.update(responsePool);

    return cards.getResponseCards(responseCardIndexes);
}

/**
 * Return all current responses of the current turn to their respective player's since we are likely
 * resetting the turn and giving responses back
 * @param gameId the document id of the game
 * @param game the game in which to return responses for, if the current turn is valid
 */
export async function returnResponseCards(gameId: string, game: Game): Promise<void> {
    if (game.turn) {
        const playerCollection = firestore.collection(COLLECTION_GAMES)
            .doc(gameId)
            .collection(COLLECTION_PLAYERS);

        await firestore.runTransaction(async (transaction) => {
            for (const [playerId, responses] of Object.entries<ResponseCard[]>(game.turn!.responses)) {
                if (playerId !== RANDO_CARDRISSIAN) {
                    const playerDoc = playerCollection.doc(playerId);
                    transaction.update(playerDoc, {
                        hand: FieldValue.arrayUnion(...responses)
                    })
                }
            }
        });
    }
}

/**
 * Set the judge rotation order for a game
 *
 * @param gameId the id of the game to set order for
 * @param judgingOrder the judging order array of player id's (excluding rando cardrissian)
 */
export async function setJudgeRotation(gameId: string, judgingOrder: string[]): Promise<void> {
    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update({
        judgeRotation: judgingOrder
    })
}

/**
 * Set the turn for a game
 *
 * @param gameId the id of the game to set the turn for
 * @param turn the turn to set
 */
export async function setTurn(gameId: string, turn: Turn): Promise<void> {
    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update({
        turn: turn
    })
}

/**
 * Update the {@link Game} state
 * @param gameId the game to update
 * @param state the state to update to
 * @param players the list of players to update their state of
 */
export async function updateState(gameId: string, state: GameState, players: Player[] = []): Promise<void> {
    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update({
        state: state
    });

    // We should also update all the UserGame states for every player connected to the game
    if (players.length > 0) {
        for (const player of players) {
            if (!player.isRandoCardrissian) {
                const playerUserGameDoc = firestore.collection(COLLECTION_USERS)
                    .doc(player.id)
                    .collection(COLLECTION_GAMES)
                    .doc(gameId);

                try {
                    await playerUserGameDoc.update({
                        state: state
                    })
                } catch (e) {
                    console.log(`Unable to update player's game state: ${e}`)
                }
            }
        }
    }
}

export async function incrementRound(gameId: string): Promise<void> {
    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update({
        round: FieldValue.increment(1)
    });
}

export async function setGameWinner(gameId: string, playerId: string): Promise<void> {
    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update({
        winner: playerId
    });
}

/**
 * Seed a {@link Game} card pool with an array of prompt and response card id indexes
 *
 * @param gameId the id of the {@link Game} to seed
 * @param promptCardIndexes the array of prompt card indexes to set
 * @param responseCardIndexes the array of response card indexes to set
 */
export async function seedCardPool(
    gameId: string,
    promptCardIndexes: string[],
    responseCardIndexes: string[]
): Promise<void> {
    console.log(`Seeding Game(${gameId}) Card Pool`);
    console.log(`Prompts: ${promptCardIndexes}`);
    console.log(`Responses: ${responseCardIndexes}`);

    const cardPoolCollection = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_CARD_POOL);

    await cardPoolCollection.doc(DOCUMENT_PROMPTS)
        .set({
            cards: (promptCardIndexes ?? [])
        });

    await cardPoolCollection.doc(DOCUMENT_RESPONSES)
        .set({
            cards: (responseCardIndexes ?? [])
        });
}