import {CallableContext} from "firebase-functions/lib/providers/https";
import {error} from "../util/error";
import * as firebase from "../firebase/firebase";

/**
 * Kick Player - [Callable Function]
 *
 * Kick a player from your game, only possible for game owner, and this will effectively ban them
 * from that game so they can't re-join
 */
export async function handleKickPlayer(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gameId = data.game_id;
    const playerId = data.player_id;

    if (!uid) error('unauthenticated', `You must be authenticated to use this endpoint`);
    if (!gameId) error('invalid-argument', 'You must specify a valid game');
    if (!playerId) error('invalid-argument', 'You must specify the player you want to kick');

    const game = await firebase.games.getGame(gameId);
    if (game) {
        // Verify that authenticated user is the owner
        if (game.ownerId === uid) {
            // Mark player as in-active
            await firebase.firestore.runTransaction(async (transaction) => {
                firebase.games.leaveGame(transaction, playerId, game);
                firebase.players.deleteUserGame(transaction, uid, gameId);
            });

            console.log(`Player(${playerId}) was kicked from the Game(${game.gid})`)

            return {
                success: true,
                game_id: gameId
            }
        } else {
            error('permission-denied', 'Only the owner of a game can kick a player');
        }
    } else {
        error('not-found', `Couldn't find a game for the Code: ${gameId}`);
    }
}