import {CallableContext} from "firebase-functions/lib/providers/https";
import * as firebase from "../firebase/firebase";
import {error} from "../util/error";
import {Player} from "../models/player";
import {UserGame} from "../models/usergame";
import {none} from "../util/array";
import {Game} from "../models/game";

/**
 * Join Game - [Callable Function]
 * This function manages player's joining games and setting their state correctly
 */
export async function handleJoinGame(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gid = data.gid;
    const gameId = data.game_id;
    const name = data.name;
    const avatar = data.avatar;

    if (!uid) error('unauthenticated', `You must be authenticated to use this endpoint`);
    if (!gid && !gameId) error('invalid-argument', 'You must specify a valid game code or id');
    if (!name) error('invalid-argument', `You must send a valid user name to join with`);
    // TODO: This would be a good point to set a 'default' avatar

    // Check the game document id first
    let game: Game | undefined;
    if (gameId) {
        game = await firebase.games.getGame(gameId);
    } else if (gid) {
        game = await firebase.games.findGame(gid);
    }
    if (game) {

        // Game completed, deny request
        if (game.state === 'completed')
            error('invalid-argument', 'This game has already completed');

        // Game is starting, deny request
        if (game.state === 'starting')
            error('cancelled', 'This game is currently starting, please try again');

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
                firebase.players.joinGame(transaction, game!.id, player);

                // Create User Game Record on player obj
                const userGame: UserGame = {
                    gid: game!.gid,
                    state: game!.state,
                    joinedAt: new Date().toISOString()
                };
                firebase.players.createUserGame(transaction, uid, game!.id, userGame);

                // If game is in-progress, then be sure to add this person to the judging order
                if (game!.state === 'inProgress') {
                    if (game!.judgeRotation && none(game!.judgeRotation, (id) => id === uid)) {
                        console.log(`Adding User(${uid}) to the Judge Rotation for Game(${game!.id})`);
                        firebase.games.addToJudgeRotation(transaction, game!.id, uid);
                    }

                    // TODO: Also check if we need to deal them into the ongoing game
                }

                // Notify game owner that someone has joined their game
                if (uid !== game!.ownerId) {
                    await firebase.push.sendPlayerJoinedMessage(game!, name)
                }
            });

            return game;
        } else {
            error('unavailable', `This Game, ${gid}, is already full. Cannot join.`);
        }
    } else {
        error('not-found', `Couldn't find a game for the Code: ${gid}`);
    }
}