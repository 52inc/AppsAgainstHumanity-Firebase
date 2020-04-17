import {COLLECTION_GAMES, COLLECTION_PLAYERS} from '../constants';
import {ResponseCard} from "../../models/cards";
import {firestore} from "../firestore";

/**
 * Set the hand for the provided user for a given game
 *
 * @param gameId the id of the game in which the context of this action is being made
 * @param playerId the id of the player to update
 * @param responseCards the list of {@link ResponseCard} to update as the player's hand
 */
export async function setHand(gameId: string, playerId: string, responseCards: ResponseCard[]): Promise<void> {
    const playerDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(playerId);

    await playerDoc.update({
        hand: responseCards
    });
}