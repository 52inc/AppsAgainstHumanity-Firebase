import {CallableContext} from "firebase-functions/lib/providers/https";
import {error} from "../util/error";
import * as firebase from "../firebase/firebase.js";
import {all, any, none} from "../util/array";
import {ResponseCard} from "../models/cards";

/**
 * Submit Responses - [Callable Function]
 *
 * This function guards the user's response submissions to the current turn as well as notify the current judge
 * if all responses to a game have been submitted
 */
export async function handleSubmitResponses(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gameId = data.game_id;
    const responses: string[] = data.responses;

    // Pre-conditions
    if (!uid) error('unauthenticated', 'You must be signed-in to perform this action');
    if (!gameId) error('invalid-argument', 'You must submit a valid game id');
    if (!responses || responses.length === 0) error('invalid-argument', 'You must submit valid responses');

    // Fetch the game for the given document id
    await firebase.firestore.runTransaction(async (transaction) => {
        const game = await firebase.games.getGameByTransaction(transaction, gameId);
        if (!game) error('not-found', 'Unable to find the game for the provided id');

        const players = await firebase.games.getPlayersByTransaction(transaction, gameId);
        if (!players || players.length === 0) error('not-found', 'Unable to find this player in this game');
        const player = players.find((p) => p.id === uid);
        if (!player) error('not-found', 'Unable to find this player in this game');

        // 1. Remove all responses from the player's hand and update that player's object
        const newHand: ResponseCard[] = player.hand?.filter((c) => {
            return none(responses, (cid) => c.cid === cid);
        }) || [];

        const submittedResponses = player.hand?.filter((c) => {
            return any(responses, (cid) => c.cid === cid);
        });

        if (submittedResponses) {
            // Update the user's hand in their game document
            firebase.players.setHandByTransaction(transaction, gameId, uid, newHand);

            // 2. If we have found valid submissions from that player's hand, then submit them to the game doc
            firebase.games.submitResponseCards(transaction, gameId, uid, submittedResponses);

            // now that we have "Submitted" a response, check if the turn would be ready for judging if the responses size
            // is close to 'full'
            const areResponsesAllIn = (Object.keys(game.turn?.responses || []).length + 1) > (game.judgeRotation?.length || 0) - 1;
            if (areResponsesAllIn) {
                console.log('Responses have changed, and might be completed');

                // Check that all responses have been submitted
                const validPlayers = players.filter((p) => p.id !== game.turn?.judgeId && !p.isInactive);
                if (all(validPlayers, (p) => game.turn?.responses?.[p.id] !== undefined)) {
                    console.log(`All players have submitted a response`)
                    // Send push to judge
                    const judgePlayer = players.find((p) => p.id === game.turn?.judgeId);
                    if (judgePlayer) {
                        console.log(`Notifying the judge: ${judgePlayer.name}`);
                        await firebase.push.sendAllResponsesInMessage(game, judgePlayer);
                    }
                }
            }
        }
    });

    return {
        game_id: gameId,
        success: true
    }
}