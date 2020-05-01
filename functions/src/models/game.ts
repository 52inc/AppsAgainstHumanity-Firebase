import {Turn} from "./turn";

/**
 * Represents the game object in Firestore
 * Resource: `/games/{game_id}`
 */
export type Game = {
    id: string;
    gid: string;
    ownerId: string;
    state: GameState;
    round: number;
    prizesToWin: number;
    playerLimit: number;
    pick2Enabled?: boolean;
    draw2Pick3Enabled?: boolean;
    judgeRotation?: string[];
    cardSets: string[];
    turn?: Turn;
    winner?: string;
}

export declare type GameState = 'waitingRoom' | 'starting' | 'inProgress' | 'completed';

/**
 * Get the next judge in the game's judge rotation for the given judge id
 *
 * @param game the game to process
 * @param currentJudgeId the current judge id
 */
export function nextJudge(game: Game, currentJudgeId: string): string {
    const currentJudgeIndex = game.judgeRotation?.indexOf(currentJudgeId)!;
    if (currentJudgeIndex < game.judgeRotation!.length - 1) {
        return game.judgeRotation![currentJudgeIndex + 1];
    } else{
        return game.judgeRotation![0];
    }
}