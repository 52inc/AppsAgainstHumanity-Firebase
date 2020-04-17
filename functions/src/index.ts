import * as functions from 'firebase-functions';
import {handleStartGame} from "./funcs/startgame";

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
