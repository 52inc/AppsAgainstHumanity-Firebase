import {CallableContext} from "firebase-functions/lib/providers/https";
import {error} from "../util/error";
import * as firebase from "../firebase/firebase";
import {Turn, TurnWinner} from "../models/turn";
import {getSpecial, PromptCard} from "../models/cards";
import {Player, RANDO_CARDRISSIAN} from "../models/player";
import {Game} from "../models/game";
import {pickRandomCountFromArray} from "../util/deal";
import {asyncMapValues} from "../util/map";
import * as admin from "firebase-admin";
import FieldValue = admin.firestore.FieldValue;

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
 *
 * TODO: Clean up this function to make it less monolith
 */
export async function handlePickWinner(data: any, context: CallableContext) {
    const uid = context.auth?.uid;
    const gameId = data.game_id;
    const winningPlayerId = data.player_id;

    if (uid) {
        if (gameId) {
            // Load the game for this gameId and verify that it is in the correct state
            const game = await firebase.games.getGame(gameId);
            if (game) {
                game.id = gameId;

                /*
                 * Pre-Conditions
                 */

                if (game.state !== 'inProgress')
                    error('failed-precondition', 'This game is not in-progress, cannot pick a winner');

                if (game.turn!.judgeId !== uid)
                    error('permission-denied', 'Only the judge can pick a winner for the turn');

                const players = await firebase.games.getPlayers(gameId);
                if (!players || players.length === 0)
                    error('not-found', ' No players found for this game');

                // Prepare winner block
                const winningPlayer = players.find((p) => p.id === winningPlayerId);
                if (!winningPlayer)
                    error('invalid-argument', 'No player found for that id');

                const playerResponses = game.turn?.responses[winningPlayerId];
                if (!playerResponses)
                    error('invalid-argument', 'Couldn\'t find players response');

                /*
                 * Create New Turn
                 */

                const turnWinner: TurnWinner = {
                    playerId: winningPlayer.id,
                    playerName: winningPlayer.name,
                    playerAvatarUrl: winningPlayer.avatarUrl,
                    isRandoCardrissian: winningPlayer.isRandoCardrissian,
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
                const newPromptCard = await firebase.games.drawPromptCard(gameId);

                const turn: Turn = {
                    judgeId: nextJudge,
                    responses: {},
                    promptCard: newPromptCard,
                    winner: turnWinner
                };

                // Go ahead and set Rando Cardrissian's response if he is a part of this game
                if (players.find((p) => p.isRandoCardrissian)) {
                    let drawCount = 1;
                    if (getSpecial(newPromptCard.special) === 'PICK 2') {
                        drawCount = 2;
                    } else if (getSpecial(newPromptCard.special) === 'DRAW 2, PICK 3') {
                        drawCount = 3;
                    }
                    turn.responses[RANDO_CARDRISSIAN] = await firebase.games.drawResponseCards(gameId, drawCount);
                    console.log("Rando Cardrissian has been dealt into the next turn")
                }

                // Set the next turn and increment the round
                await firebase.games.update(gameId, {
                    turn: turn,
                    round: FieldValue.increment(1)
                });
                console.log(`Next turn has now been set!`);

                // Clear downvotes
                await firebase.games.clearDownvotes(gameId);

                // Award previous game's prompt to winning player
                await firebase.players.awardPrompt(gameId, winningPlayerId, game.turn!.promptCard);

                // Now Re-deal cards to the player based on the new prompt's special
                await dealNewCardsToPlayers(game, newPromptCard, players);

                // Check win condition, and set the game to completed
                const getPrizeLength = (player: Player) => {
                    let prizeCount = player.prizes?.length || 0;
                    if (player.id === winningPlayerId) {
                        prizeCount += 1;
                    }
                    return prizeCount;
                };

                const gameWinningPlayer = players?.find((p) => getPrizeLength(p) >= game.prizesToWin);
                if (gameWinningPlayer) {
                    await firebase.games.setGameWinner(gameId, gameWinningPlayer.id);
                    await firebase.games.updateState(gameId, 'completed', players);
                    await firebase.push.sendGameOverMessage(game, players, gameWinningPlayer);
                } else {
                    await firebase.push.sendNewRoundMessage(game, turn, players);
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

async function dealNewCardsToPlayers(game: Game, newPrompt: PromptCard, players: Player[]) {
    // Now Re-deal cards to the player based on the new prompt's special
    let dealCount = 1;
    const previousPromptSpecial = getSpecial(game.turn?.promptCard!.special);
    if (previousPromptSpecial === 'PICK 2') {
        dealCount = 2;
    }

    // if the next prompt card is a D2P3 then add an additional 2 cards to the deal
    if (getSpecial(newPrompt.special) === 'DRAW 2, PICK 3') {
        dealCount += 2;
    }

    // Get response card pool
    const cardPool = await firebase.games.getResponseCardPool(game.id);
    const playerIndexes = new Map<string, string[]>();

    // Seed the player indexes with their cards
    players
        .filter((p) => !p.isRandoCardrissian && p.id !== game.turn?.judgeId)
        .forEach((p) => {
            playerIndexes.set(p.id, pickRandomCountFromArray(cardPool.cards, dealCount))
        });

    // Update the game seed with now draw cards removed
    await firebase.games.seedCardPool(game.id, [], cardPool.cards);

    // Get the actual cards from the DB
    const playerCards = await asyncMapValues(playerIndexes, async (indexes) => {
        return await firebase.cards.getResponseCards(indexes);
    });

    await firebase.firestore.runTransaction(async (transaction) => {
        for (const [playerId, responseCards] of playerCards.entries()) {
            firebase.players.addToHand(transaction, game.id, playerId, responseCards);
            console.log(`New cards(count=${responseCards.length}) dealt to ${playerId}`);
        }
    });
}
