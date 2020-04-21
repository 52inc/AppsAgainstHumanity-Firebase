import * as functions from 'firebase-functions';
import {handleStartGame} from "./funcs/startgame";
import {handlePickWinner} from "./funcs/pickwinner";
import {handleDownVote} from "./funcs/downvoteprompt";
import {handleReDealHand} from "./funcs/redealhand";

/**
 * Start Game - [Callable Function]
 *
 * This function serves to start a game that is in the 'waitingRoom' state by:
 *
 * 1. Populate card pool
 * 2. Generated first turn
 * 3. Deal cards to players
 * 4. Update GameState => 'inProgress'
 *
 * Request Params:
 *     'game_id': the Firestore Document Id of the game you want to start
 *
 * Response:
 * <p><code>
 *      {
 *          "game_id": "some_game_document_id",
 *          "success": true
 *      }
 * </code></p>
 */
exports.startGame = functions.https.onCall(handleStartGame);

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
exports.pickWinner = functions.https.onCall(handlePickWinner);

/**
 * Re-Deal Hand - [Callable Function]
 *
 * This function will re-deal a user's hand in exchange for 1 prize card
 */
exports.reDealHand = functions.https.onCall(handleReDealHand);

/**
 * Downvotes - [Firestore onUpdate Trigger]
 *
 * Resource: `games/{gameId}`
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
exports.downvotePrompt = functions.firestore
    .document('games/{gameId}')
    .onUpdate(handleDownVote);