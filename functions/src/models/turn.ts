import {PromptCard, ResponseCard} from "./cards";

export type Turn = {
    judgeId: string;
    promptCard: PromptCard;
    responses: {[playerId: string]: ResponseCard[]};
    downvotes?: string[];
    winner?: TurnWinner;
}

export type TurnWinner = {
    playerId: string;
    playerName: string;
    playerAvatarUrl?: string;
    promptCard: PromptCard;
    response: ResponseCard[];
}