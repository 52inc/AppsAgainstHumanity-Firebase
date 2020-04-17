import {PromptCard, ResponseCard} from "./cards";

export type Turn = {
    judgeId: string;
    promptCard: PromptCard;
    responses: Map<string, ResponseCard[]>;
    downvotes?: string[];
    winnerId?: string;
}