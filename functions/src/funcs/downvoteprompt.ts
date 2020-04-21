import {Change, EventContext} from "firebase-functions/lib/cloud-functions";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {Game} from "../models/game";
import * as firestore from "../firestore/firestore";
import {Player} from "../models/player";

const downVoteThreshold = 2 / 3;

/**
 * Downvotes - [Firestore onUpdate Trigger]
 *
 * Check if the update involves a change in the current (and same) turn's downvotes and if it does
 * check if the downvotes is >= 2/3rds of the player count. If this is the case then we will reset the current
 * turn and draw a new prompt card.
 *
 * 1. Check that turn doesn't change on this update
 * 2. Check that the number downvotes has changed
 * 3. Return all response cards that may have been submitted to the players
 * 4. Draw a new prompt card
 * 5. Reset the turn with new prompt, no downvotes, and no responses but keep the same judge
 */
export async function handleDownVote(change: Change<DocumentSnapshot>, context: EventContext) {
    const gameId = context.params.gameId;

    const previousGame = change.before.data() as Game;
    const newGame = change.before.data() as Game;

    const sameTurn = previousGame.turn?.promptCard?.cid === newGame.turn?.promptCard?.cid;
    if (sameTurn) {
        const previousDownVotes = previousGame.turn?.downvotes || [];
        const newDownVotes = newGame.turn?.downvotes || [];
        if (newDownVotes.length > previousDownVotes.length) {
            // Downvotes have changed pull the player list to check if > 2/3 of players have downvoted
            const players = await firestore.games.getPlayers(gameId);
            if (players) {
                const numPlayers = players.length;
                if (newDownVotes.length >= Math.floor(downVoteThreshold * numPlayers)) {
                    await resetTurn(gameId, newGame, players!);
                }
            }
        }
    }
}

async function resetTurn(gameId: string, game: Game, players: Player[]): Promise<void> {
    if (game.turn) {
        // Return any responses to players
        await firestore.games.returnResponseCards(game);

        // Re-draw a new prompt card
        const newPromptCard = await firestore.games.drawPromptCard(gameId);

        // Reset the turn
        await firestore.games.setTurn(gameId, {
            judgeId: game.turn!.judgeId,
            promptCard: newPromptCard,
            downvotes: [],
            responses: {},
            winner: game.turn!.winner,
        });

        console.log(`The current turn has been reset for Game(${game.id})!`)
    }
}