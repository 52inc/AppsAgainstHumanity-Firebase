import {PromptCard, ResponseCard} from "./cards";

export type Turn = {
    judgeId: string;
    promptCard: PromptCard;
    responses: {[playerId: string]: ResponseCard[]};
    downvotes?: string[];
    winnerId?: string;
}