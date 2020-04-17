import {
    COLLECTION_CARD_POOL,
    COLLECTION_GAMES,
    COLLECTION_PLAYERS, COLLECTION_USERS,
    DOCUMENT_PROMPTS,
    DOCUMENT_RESPONSES
} from '../constants';
import {Game, GameState} from "../../models/game";
import {Player} from "../../models/player";
import {Turn} from "../../models/turn";
import {firestore} from "../firestore";

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
    })

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