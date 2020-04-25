import {Change, EventContext} from "firebase-functions/lib/cloud-functions";
import {DocumentSnapshot} from "firebase-functions/lib/providers/firestore";
import {Game} from "../models/game";
import * as firebase from '../firebase/firebase';
import {all} from "../util/array";
import _ = require("lodash");

export async function handleResponsesChanged(change: Change<DocumentSnapshot>, context: EventContext) {
    const gameId = context.params.gameId;

    const beforeGame = change.before.data() as Game;
    const afterGame = change.after.data() as Game;

    console.log(`Before Game: ${JSON.stringify(beforeGame)}`);
    console.log(`After Game: ${JSON.stringify(afterGame)}`);

    if (afterGame.turn?.responses){
        const areResponsesAllIn = Object.keys(afterGame.turn.responses).length > (afterGame.judgeRotation?.length || 0) - 1;
        if (!_.isEqual(beforeGame.turn?.responses, afterGame.turn.responses) && areResponsesAllIn) {
            console.log('Responses have changed, and might be completed');
            const players = await firebase.games.getPlayers(gameId);
            if (players) {
                // Check that all responses have been submitted
                const validPlayers = players.filter((p) => p.id !== afterGame.turn?.judgeId && !p.isInactive);
                if (all(validPlayers, (p) => afterGame.turn?.responses?.[p.id] !== undefined)) {
                    console.log(`All players have submitted a response`)
                    // Send push to judge
                    const judgePlayer = players.find((p) => p.id === afterGame.turn?.judgeId);
                    if (judgePlayer) {
                        console.log(`Notifying the judge: ${judgePlayer.name}`);
                        await firebase.push.sendAllResponsesInMessage(afterGame, judgePlayer);
                    }
                }
            }
        }
    }
}