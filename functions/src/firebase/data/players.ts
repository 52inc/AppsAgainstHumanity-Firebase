import {COLLECTION_GAMES, COLLECTION_PLAYERS} from '../constants';
import {PromptCard, ResponseCard} from "../../models/cards";
import {firestore} from "../firebase";
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
 * Re-deal hand for the provided user for a given game and remove a prize card as price
 *
 * @param gameId the id of the game in which the context of this action is being made
 * @param playerId the id of the player to update
 * @param prize the prize to remove as cost
 * @param responseCards the list of {@link ResponseCard} to update as the player's hand
 */
export async function reDealHand(gameId: string, playerId: string, prize: PromptCard, responseCards: ResponseCard[]): Promise<void> {
    const playerDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(playerId);

    await playerDoc.update({
        hand: responseCards,
        prizes: FieldValue.arrayRemove(prize)
    });
}

/**
 * Add a list of {@link ResponseCard}s to a given player's hand
 * @param transaction
 * @param gameId the id of the game this is context to
 * @param playerId the id of the player to add to
 * @param responseCards the cards to add to their hand
 */
export function addToHand(
    transaction: admin.firestore.Transaction,
    gameId: string,
    playerId: string,
    responseCards: ResponseCard[]
) {
    const playerDoc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(playerId);

    transaction.update(playerDoc, {
        hand: FieldValue.arrayUnion(...responseCards)
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