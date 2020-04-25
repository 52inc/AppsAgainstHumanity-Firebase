import {Change, EventContext} from "firebase-functions/lib/cloud-functions";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {Game} from "../models/game";
import * as firebase from '../firebase/firebase';
import {all} from "../util/array";

export async function handleResponsesChanged(change: Change<DocumentSnapshot>, context: EventContext) {
    const gameId = context.params.gameId;

    const beforeGame = change.before.data() as Game;
    const afterGame = change.after.data() as Game;

    console.log(`Before Game: ${JSON.stringify(beforeGame)}`);
    console.log(`After Game: ${JSON.stringify(afterGame)}`);

    if (beforeGame.turn?.responses !== afterGame.turn?.responses) {
        const players = await firebase.games.getPlayers(gameId);
        if (players) {
            // Check that all responses have been submitted
            if (all(players, (p) => afterGame.turn?.responses?.[p.id] !== undefined)) {
                // Send push to judge
                const judgePlayer = players.find((p) => p.id === afterGame.turn?.judgeId);
                if (judgePlayer) {
                    await firebase.push.sendAllResponsesInMessage(afterGame, judgePlayer);
                }
            }
        }
    }
}