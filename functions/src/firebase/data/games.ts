import {
    COLLECTION_CARD_POOL, COLLECTION_DOWNVOTES,
    COLLECTION_GAMES,
    COLLECTION_PLAYERS, COLLECTION_USERS,
    DOCUMENT_PROMPTS,
    DOCUMENT_RESPONSES, DOCUMENT_TALLY
} from '../constants';
import {Game, GameState} from "../../models/game";
import {Player, RANDO_CARDRISSIAN} from "../../models/player";
import {cards, firestore} from "../firebase";
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
 * Fetch a {@link Player} for a {@link Game} by the {gameId}
 * @param gameId the id of the game to get all the players for
 * @param playerId the id of the player to fetch
 */
export async function getPlayer(gameId: string, playerId: string): Promise<Player | undefined> {
    const playerDoc = await firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(playerId);

    const playerSnapshot = await playerDoc.get();
    return playerSnapshot.data() as Player;
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

export async function getResponseCardPool(gameId: string): Promise<CardPool> {
    const responseCardPool = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_CARD_POOL)
        .doc(DOCUMENT_RESPONSES);

    const responses = await responseCardPool.get();
    return responses.data() as CardPool;
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

export async function clearDownvotes(gameId: string) {
    const tallyDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_DOWNVOTES)
        .doc(DOCUMENT_TALLY);

    await tallyDoc.set({
        'votes': []
    });
}

/**
 * Update the game state, specifying what you want to udpate with
 *
 * @see admin.firestore.DocumentReference#update
 * @param gameId the game to update
 * @param data the data to update
 */
export async function update(gameId: string, data: FirebaseFirestore.UpdateData) {
    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update(data);
}

/**
 * Update the {@link Game} state
 * @param gameId the game to update
 * @param data the game state data to update
 * @param players the list of players to update their state of
 */
export async function updateStateWithData(gameId: string, data: FirebaseFirestore.UpdateData, players: Player[] = []): Promise<void> {
    if (!data.state) return Promise.reject('You must pass a state when updating this way');

    const gameDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId);

    await gameDoc.update(data);

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
                        state: data.state
                    })
                } catch (e) {
                    console.log(`Unable to update player's game state: ${e}`)
                }
            }
        }
    }
}

/**
 * Update the {@link Game} state
 * @param gameId the game to update
 * @param state the state to update to
 * @param players the list of players to update their state of
 */
export async function updateState(gameId: string, state: GameState, players: Player[] = []): Promise<void> {
    return updateStateWithData(gameId, {
        state: state
    }, players);
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
    promptCardIndexes: string[] = [],
    responseCardIndexes: string[] = []
): Promise<void> {
    if (promptCardIndexes.length > 0 && responseCardIndexes.length > 0) {
        console.log(`Seeding Game(${gameId}) Card Pool`);
    }
    console.log(`Prompts: ${promptCardIndexes}`);
    console.log(`Responses: ${responseCardIndexes}`);

    const cardPoolCollection = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_CARD_POOL);

    if (promptCardIndexes.length > 0) {
        await cardPoolCollection.doc(DOCUMENT_PROMPTS)
            .set({
                cards: (promptCardIndexes ?? [])
            });
    }

    if (responseCardIndexes.length > 0) {
        await cardPoolCollection.doc(DOCUMENT_RESPONSES)
            .set({
                cards: (responseCardIndexes ?? [])
            });
    }
}