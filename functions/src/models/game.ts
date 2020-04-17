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
    judgeRotation?: string[];
    cardSets: string[];
    turn?: Turn;
    winner?: string;
}

export declare type GameState = 'waitingRoom' | 'inProgress' | 'completed';