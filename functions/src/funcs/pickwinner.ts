import {CallableContext} from "firebase-functions/lib/providers/https";
import {error} from "../util/error";
import * as firestore from "../firestore/firestore";
import {Turn, TurnWinner} from "../models/turn";
import {getSpecial} from "../models/cards";
import {RANDO_CARDRISSIAN} from "../models/player";

/**
 * Pick Winner - [Callable Function]
 *
 * 1. Set winner on Turn object of the current game
 * 2. Award the prompt to the winning player
 * 3. Re-generate the Turn
 *    a. Draw new Prompt Card
 *    b. Clear responses
 *    c. Clear downvotes
 *    d. Draw Rando-Cardrissian, if present
 * 4. Draw new cards for all players
 */
export async function handlePickWinner(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gameId = data.game_id;
    const winningPlayerId = data.player_id;

    if (uid) {
        if (gameId) {
            // Load the game for this gameId and verify that it is in the correct state
            const game = await firestore.games.getGame(gameId);
            if (game) {
                if (game.state !== 'inProgress')
                    error('failed-precondition', 'This game is not in-progress, cannot pick a winner');

                if (game.turn!.judgeId !== uid)
                    error('permission-denied', 'Only the judge can pick a winner for the turn');

                let players = await firestore.games.getPlayers(gameId);
                if (!players || players.length === 0)
                    error('not-found', ' No players found for this game');

                // Prepare winner block
                const winningPlayer = players.find((p) => p.id === winningPlayerId);
                if (!winningPlayer)
                    error('invalid-argument', 'No player found for that id');

                const playerResponses = game.turn?.responses[winningPlayerId];
                if (!playerResponses)
                    error('invalid-argument', 'Couldn\'t find players response');

                const turnWinner: TurnWinner = {
                    playerId: winningPlayer.id,
                    playerName: winningPlayer.name,
                    playerAvatarUrl: winningPlayer.avatarUrl,
                    promptCard: game.turn?.promptCard!,
                    response: playerResponses
                };

                // Pick next judge from order
                const currentJudgeIndex = game.judgeRotation?.indexOf(game.turn?.judgeId!)!;
                let nextJudge: string;
                if (currentJudgeIndex < game.judgeRotation!.length - 1) {
                    nextJudge = game.judgeRotation![currentJudgeIndex + 1];
                } else{
                    nextJudge = game.judgeRotation![0];
                }

                // Draw next prompt card
                const promptCard = await firestore.games.drawPromptCard(gameId);

                const turn: Turn = {
                    judgeId: nextJudge,
                    responses: {},
                    downvotes: [],
                    promptCard: promptCard,
                    winner: turnWinner
                };

                // Go ahead and set Rando Cardrissian's response if he is a part of this game
                if (players.find((p) => p.isRandoCardrissian)) {
                    let drawCount = 1;
                    if (getSpecial(promptCard.special) === 'PICK 2') {
                        drawCount = 2;
                    } else if (getSpecial(promptCard.special) === 'DRAW 2, PICK 3') {
                        drawCount = 3;
                    }
                    turn.responses[RANDO_CARDRISSIAN] = await firestore.games.drawResponseCards(gameId, drawCount);
                    console.log("Rando Cardrissian has been dealt into the next turn")
                }

                // Update the turn object in the game
                await firestore.games.setTurn(gameId, turn);
                console.log(`Next turn has now been set!`);

                // Award previous game's prompt to winning player
                await firestore.players.awardPrompt(gameId, winningPlayerId, game.turn!.promptCard);

                // Now Re-deal cards to the player based on the new prompt's special
                let dealCount = 1;
                const previousPromptSpecial = getSpecial(game.turn?.promptCard!.special);
                if (previousPromptSpecial === 'PICK 2') {
                    dealCount = 2;
                }

                // if the next prompt card is a D2P3 then add an additional 2 cards to the deal
                if (getSpecial(promptCard.special) === 'DRAW 2, PICK 3') {
                    dealCount += 2;
                }

                for (const player of players) {
                    if (!player.isRandoCardrissian) {
                        // Draw random count of response cards
                        const responseCards = await firestore.games.drawResponseCards(gameId, dealCount);

                        // Give these new cards to each player
                        await firestore.players.addToHand(gameId, player.id, responseCards);

                        console.log(`New cards dealt to ${player.name}`);
                    }
                }

                // Increment the game round
                await firestore.games.incrementRound(gameId);

                // Check win condition, and set the game to completed
                players = await firestore.games.getPlayers(gameId);
                const gameWinningPlayer = players?.find((p) => (p.prizes?.length ?? 0) >= game.prizesToWin);
                if (gameWinningPlayer) {
                    await firestore.games.setGameWinner(gameId, gameWinningPlayer.id);
                    await firestore.games.updateState(gameId, 'completed', players);
                }

                return {
                    game_id: gameId,
                    success: true,
                }
            } else{
                error('not-found',
                    `Unable to find a game for ${gameId}`)
            }
        } else {
            error("invalid-argument", 'The function must be called with a valid "game_id".');
        }
    } else {
        // Throw error
        error('failed-precondition', 'The function must be called while authenticated.');
    }
}