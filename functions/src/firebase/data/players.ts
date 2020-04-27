import {COLLECTION_GAMES, COLLECTION_PLAYERS, COLLECTION_USERS} from '../constants';
import {PromptCard, ResponseCard} from "../../models/cards";
import {firestore} from "../firebase";
import * as admin from "firebase-admin";
import FieldValue = admin.firestore.FieldValue;
import {Player} from "../../models/player";
import {UserGame} from "../../models/usergame";

/**
 * Join a player to a given game id
 * @param transaction the FB:FS transaction
 * @param gameId the game to join
 * @param player the player to add
 */
export function joinGame(transaction: admin.firestore.Transaction, gameId: string, player: Player) {
    const doc = firestore.collection(COLLECTION_GAMES)
        .doc(gameId)
        .collection(COLLECTION_PLAYERS)
        .doc(player.id);
    transaction.set(doc, player, { merge: true });
}

/**
 * Create a new UserGame object reference to the game on the player
 * @param transaction the FB transaction to execute in
 * @param uid the user's id
 * @param gameId the games document id
 * @param userGame the document to write
 */
export function createUserGame(transaction: admin.firestore.Transaction, uid: string, gameId: string, userGame: UserGame) {
    const doc = firestore.collection(COLLECTION_USERS)
        .doc(uid)
        .collection(COLLECTION_GAMES)
        .doc(gameId);
    transaction.set(doc, userGame, { merge: true });
}

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