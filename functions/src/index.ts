import * as functions from 'firebase-functions';
import {handleStartGame} from "./funcs/startgame";
import {handlePickWinner} from "./funcs/pickwinner";
import {handleDownVote} from "./funcs/downvoteprompt";
import {handleReDealHand} from "./funcs/redealhand";
import {handleAccountDeletion} from "./funcs/accountdeletion";
import {handleJoinGame} from "./funcs/joingame";
import {handleSubmitResponses} from "./funcs/submitresponse";
import {handleUserUpdates} from "./funcs/userupdates";
import {handleLeaveGame} from "./funcs/leavegame";
import {handleKickPlayer} from "./funcs/kickplayer";
import {handleWave} from "./funcs/wave";

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
 * Join Game - [Callable Function]
 *
 * This function is used to let player's join a game safely
 */
exports.joinGame = functions.https.onCall(handleJoinGame);

/**
 * Leave Game - [Callable Function]
 *
 * This function let's a player leave a waiting room or an ongoing game
 * If the game is 'starting' then this request will be denied, if the game is completed only
 * the game reference is deleted, otherwise the player is set to inactive, removed from judging, and
 * any responses in the turn removed
 */
exports.leaveGame = functions.https.onCall(handleLeaveGame);

/**
 * Kick Player - [Callable Function]
 *
 * Kick a player from your game, only possible for game owner, and this will effectively ban them
 * from that game so they can't re-join
 */
exports.kickPlayer = functions.https.onCall(handleKickPlayer);

/**
 * Submit Response - [Callable Function]
 *
 * This function will be used by players to be able to submit a response to an ongoing game
 */
exports.submitResponses = functions.https.onCall(handleSubmitResponses);

/**
 * Wave at a player - [Callable Function]
 *
 * This function will let players wave at other players
 *
 * Request Params:
 *     'game_id': the Firestore Document Id of the game you want to start
 *     'player_id': the id of the player you want to wave to
 */
exports.wave = functions.https.onCall(handleWave);

/**
 * Downvotes - [Firestore onUpdate Trigger]
 *
 * Resource: `games/{gameId}/downvotes/{tally}`
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
    .document('games/{gameId}/downvotes/tally')
    .onUpdate(handleDownVote);

/**
 * User Updates - [Firestore onUpdate Trigger]
 *
 * Resource: `user/{userId}`
 *
 * When a user updates their name or avatar url we need to retro update all of
 * their Player objects on any games.
 *
 * 1. Check if any part of the actual profile has changed
 * 2. Mass update user's Player objs
 */
exports.updateUserProfile = functions.firestore
    .document('users/{userId}')
    .onUpdate(handleUserUpdates);

/**
 * Account Deletion - [Authentication Trigger]
 *
 * This function will listen to account deletions and delete all of their user data
 * stored in firebase
 */
exports.accountDeletion = functions.auth
    .user()
    .onDelete(handleAccountDeletion);