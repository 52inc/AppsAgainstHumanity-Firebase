import {CallableContext} from "firebase-functions/lib/providers/https";
import {error} from "../util/error";
import * as firestore from "../firestore/firestore";

/**
 * Re-Deal Hand - [Callable Function]
 *
 * This function will re-deal a user's hand in exchange for 1 prize card
 */
export async function handleReDealHand(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gameId = data.game_id;

    if (uid) {
        if (gameId) {
            const game = await firestore.games.getGame(gameId);
            if (game) {
                const player = await firestore.games.getPlayer(gameId, uid);
                if (player) {
                    // Check if player has enough prizes to re-deal their hand
                    if (player.prizes && player.prizes.length > 0) {
                        console.log(`Player(${uid}) has enough prizes to re-deal their hand`);
                        const prize = player.prizes.pop()!;
                        const newHand = await firestore.games.drawResponseCards(gameId, 10);

                        await firestore.players.reDealHand(gameId, uid, prize, newHand);
                        console.log(`Successfully re-dealt hand for ${player.name} for the cost of ${prize.text}`);

                        return {
                            gameId: gameId,
                            success: true
                        }
                    } else {
                        error('failed-precondition', 'You don\'t have enough prizes to re-deal your hand')
                    }
                } else {
                    error('not-found', 'Unable to find you as a valid player for this game')
                }
            } else {
                error('invalid-argument', 'Please submit a valid game to re-deal')
            }
        } else {
            error('invalid-argument', 'Please submit a valid game to re-deal')
        }
    } else {
        error('unauthenticated', 'You must be signed-in to use this function')
    }
}