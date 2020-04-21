import {GameState} from "./game";

export type UserGame = {
    id?: string;
    gid: string;
    joinedAt: string;
    state: GameState
}