import * as functions from 'firebase-functions';
import {handleStartGame} from "./funcs/startgame";
import {handlePickWinner} from "./funcs/pickwinner";

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