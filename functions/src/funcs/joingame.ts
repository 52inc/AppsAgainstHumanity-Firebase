import {CallableContext} from "firebase-functions/lib/providers/https";
import * as firebase from "../firebase/firebase";
import {error} from "../util/error";
import {Player} from "../models/player";
import {UserGame} from "../models/usergame";

/**
 * Join Game - [Callable Function]
 * This function manages player's joining games and setting their state correctly
 */
export async function handleJoinGame(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gid = data.gid;
    const name = data.name;
    const avatar = data.avatar;

    if (!uid) error('unauthenticated', `You must be authenticated to use this endpoint`);
    if (!gid) error('invalid-argument', 'You must specify a valid game code');
    if (!name) error('invalid-argument', `You must send a valid user name to join with`);
    // TODO: This would be a good point to set a 'default' avatar

    const game = await firebase.games.findGame(gid);
    if (game) {
        const players = await firebase.games.getPlayers(game.id);
        if ((players?.length || 0) < (game.playerLimit || 30)) {
            console.log("Player limit is NOT met, add player to game");

            await firebase.firestore.runTransaction(async (transaction) => {
                const player: Player = {
                    id: uid,
                    name: name,
                    avatarUrl: avatar,
                    isInactive: false,
                    isRandoCardrissian: false,
                };
                firebase.players.joinGame(transaction, game.id, player);

                // Create User Game Record on player obj
                const userGame: UserGame = {
                    gid: gid,
                    state: game.state,
                    joinedAt: new Date().toISOString()
                };
                firebase.players.createUserGame(transaction, uid, game.id, userGame);
            });

        } else {
            error('unavailable', `This Game, ${gid}, is already full. Cannot join.`);
        }
    } else {
        error('not-found', `Couldn't find a game for the Code: ${gid}`);
    }
}