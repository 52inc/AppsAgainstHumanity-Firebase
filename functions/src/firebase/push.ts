import * as admin from 'firebase-admin';
import {Player} from "../models/player";
import {Turn} from "../models/turn";
import * as firebase from "./firebase";
import {COLLECTION_DEVICES, COLLECTION_USERS} from "./constants";
import {flatten} from "../util/flatmap";
import {Game} from "../models/game";
import Timestamp = admin.firestore.Timestamp;
import BatchResponse = admin.messaging.BatchResponse;
import MulticastMessage = admin.messaging.MulticastMessage;

/**
 * Send a push notification to the game owner that a player has joined their game.
 *
 * @param game the game that was joined
 * @param playerName the name of the player that joined
 */
export async function sendPlayerJoinedMessage(game: Game, playerName: string) {
    const tokens = await getPlayerPushTokens([{
        id: game.ownerId,
        isRandoCardrissian: false,
        name: ""
    }]);
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Player Joined - ${game.gid}`,
            body: `${playerName} has joined your game!`
        },
        android: {
            notification: {
                tag: 'player-joined',
                ticker: 'Player joined!',
                priority: "high"
            },
        },
    })
}

/**
 * Notify the judge that all responses have been submitted and he must choose a winner
 * @param game the game in context
 * @param judge the current judge of the round
 */
export async function sendAllResponsesInMessage(game: Game, judge: Player) {
    const tokens = await getPlayerPushTokens([judge]);
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Time to judge - ${game.gid}`,
            body: `All responses are in. Choose a winner!`
        },
        android: {
            notification: {
                tag: 'all-responses',
                ticker: 'Time to judge!',
                priority: "max"
            },
        },
    })
}

/**
 * Send push notifications for the start of a new game
 * @param game the game that started
 * @param players the players of that game
 * @param firstTurn the indicating turn of the round to determine the judge to name
 */
export async function sendGameStartedMessage(game: Game, players: Player[], firstTurn: Turn) {
    const tokens = await getPlayerPushTokens(players);
    const firstJudge = players.find((p) => p.id === firstTurn.judgeId);
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Game Started - ${game.gid}`,
            body: `First judge is ${firstJudge?.name}`,
            imageUrl: firstJudge?.avatarUrl
        },
        android: {
            notification: {
                tag: 'game-started',
                ticker: 'Game Started!',
                priority: "max"
            },
        },
    })
}

/**
 * Send a push notification to all players to let them know that the current turn prompt has been reset
 * and a new prompt is being chosen
 * @param game the game of context
 * @param players the players to notify
 * @param newTurn the new turn generated
 */
export async function sendTurnResetMessage(game: Game, players: Player[], newTurn: Turn) {
    const tokens = await getPlayerPushTokens(players);
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Game - ${game.gid}`,
            body: `The prompt has been voted out, picking a new prompt! \"${newTurn.promptCard.text}\"`
        },
        android: {
            notification: {
                tag: 'turn-reset',
                ticker: 'Turn reset!',
                priority: "high"
            },
        },
    })
}

/**
 * Send push notification to all players that the next round has started
 * - For player who is new Judge, tell them they are judge
 * - For player who won last round, tell them they won
 * - For everyone else, just state that round has started
 * @param game the game in context
 * @param newTurn the next turn to be played
 * @param players the list of players to send the message to
 */
export async function sendNewRoundMessage(game: Game, newTurn: Turn, players: Player[]) {
    const judgePushToken = await getPlayerPushTokens(players.filter((p) => p.id === newTurn.judgeId));
    const winnerToken = await getPlayerPushTokens(players.filter((p) => p.id === newTurn.winner?.playerId));
    const otherTokens = await getPlayerPushTokens(players.filter((p) => p.id !== newTurn.judgeId && p.id !== newTurn.winner?.playerId));

    if (judgePushToken.length > 0) await sendNewJudgeMessage(game, judgePushToken);
    if (winnerToken.length > 0) await sendWinnerMessage(game, winnerToken);
    if (otherTokens.length > 0) await sendAllMessage(game, newTurn,game.round + 1, otherTokens);
}

/**
 * Send a Game Over push notification to all players of this game
 * @param game the game in context
 * @param players the list of players to send message to
 * @param gameWinningPlayer the game winning player
 */
export async function sendGameOverMessage(game: Game, players: Player[], gameWinningPlayer: Player) {
    const allTokens = await getPlayerPushTokens(players);
    await sendMulticastMessage({
        tokens: allTokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Game Over - ${game.gid}`,
            body: `The winner was ${gameWinningPlayer.name}`,
            imageUrl: gameWinningPlayer.avatarUrl && gameWinningPlayer.avatarUrl.length > 0 ? gameWinningPlayer.avatarUrl : undefined
        },
        android: {
            notification: {
                tag: 'game-over',
                ticker: 'Game Over!',
                priority: "high"
            },
        },
    });
}

async function sendNewJudgeMessage(game: Game, tokens: string[]) {
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Game - ${game.gid}`,
            body: `You are now the judge!`
        },
        android: {
            notification: {
                tag: 'new-judge',
                ticker: 'You are now the judge!',
                priority: "high"
            },
        },
    });
    console.log('Sending New Judge Message!')
}

async function sendWinnerMessage(game: Game, tokens: string[]) {
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `You won! - ${game.gid}`,
            body: `\"${game.turn?.promptCard?.text}\"`
        },
        android: {
            notification: {
                tag: 'new-winner',
                ticker: 'Winner!',
                priority: "high"
            },
        },
    });
    console.log('Sending Winner Message!')
}

async function sendAllMessage(game: Game, newTurn: Turn, round: number, tokens: string[]) {
    await sendMulticastMessage({
        tokens: tokens,
        data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            gameId: game.id,
        },
        notification: {
            title: `Next Round #${round} - ${game.gid}`,
            body: `\"${newTurn.promptCard.text}\"`
        },
        android: {
            notification: {
                tag: 'new-round',
                ticker: 'Next round started!',
                priority: "high"
            },
        },
    });
    console.log('Sending New Round Message!')
}

async function sendMulticastMessage(message: MulticastMessage) {
    const response = await firebase.messaging.sendMulticast(message);
    await processBatchResponse(response);
}

async function processBatchResponse(response: BatchResponse) {
    console.log(`Multicast Response(success=${response.successCount}, failure=${response.failureCount})`);
    if (response.failureCount > 0) {
        const failedResponses = response.responses
            .filter((r) => !r.success);

        // I we have failed responses with the right failure code, reset push tokens
        for (const failedResponse of failedResponses) {
            if (failedResponse.error !== undefined && failedResponse.messageId !== undefined) {
                console.log(`Failed Response (code=${failedResponse.error.code}, msg=${failedResponse.error.message}, stack=${failedResponse.error.stack})`);
                switch (failedResponse.error.code) {
                    case 'messaging/invalid-registration-token':
                    case 'messaging/registration-token-not-registered':
                        await invalidatePushToken(failedResponse.messageId);
                        break;
                }
            }
        }
    }
}

async function invalidatePushToken(token: string) {
    // Find the token
    const snapshot = await firebase.firestore.collectionGroup(COLLECTION_DEVICES)
        .where('token', '==', token)
        .limit(1)
        .get();

    if (!snapshot.empty) {
        for (const doc of snapshot.docs) {
            await doc.ref.update({
                token: '',
                updatedAt: Timestamp.now()
            })
        }
    }
}

async function getPlayerPushTokens(players: Player[]): Promise<string[]> {
    const devices = await Promise.all(players.map((value) => {
        return firebase.firestore.collection(COLLECTION_USERS)
            .doc(value.id)
            .collection(COLLECTION_DEVICES)
            .where('token', '>=', '')
            .get()
            .then((snap) => snap.docs.map((doc) => doc.data()['token'] as string))
    }));
    return flatten(devices);
}