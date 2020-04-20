import {COLLECTION_GAMES, COLLECTION_PLAYERS} from '../constants';
import {PromptCard, ResponseCard} from "../../models/cards";
import {firestore} from "../firestore";
import {Player} from "../../models/player";
import * as admin from "firebase-admin";
import FieldValue = admin.firestore.FieldValue;

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

/**
 * Add a list of {@link ResponseCard}s to a given player's hand
 * @param gameId the id of the game this is context to
 * @param playerId the id of the player to add to
 * @param responseCards the cards to add to their hand
 */
export async function addToHand(gameId: string, playerId: string, responseCards: ResponseCard[]): Promise<void> {
    const playerDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(playerId);

    await firestore.runTransaction(async (transaction) => {
        const snapshots = await transaction.getAll(playerDoc);
        const player = snapshots[0].data() as Player;

        await transaction.update(playerDoc, {
            hand: player.hand?.concat(responseCards)
        });
    });
}

/**
 * Award a prompt card to a winning player
 * @param gameId the game id
 * @param playerId the player id
 * @param promptCard the prize to award
 */
export async function awardPrompt(gameId: string, playerId: string, promptCard: PromptCard): Promise<void>{
    const playerDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(playerId);

    await playerDoc.update({
        prizes: FieldValue.arrayUnion(promptCard)
    })
}