import {PromptCard, ResponseCard} from "./cards";

export type Turn = {
    judgeId: string;
    promptCard: PromptCard;
    responses: {[playerId: string]: ResponseCard[]};
    winner?: TurnWinner;
}

export type TurnWinner = {
    playerId: string;
    playerName: string;
    playerAvatarUrl?: string;
    isRandoCardrissian: boolean;
    promptCard: PromptCard;
    response: ResponseCard[];
    responses?: {[playerId: string]: ResponseCard[]};
}