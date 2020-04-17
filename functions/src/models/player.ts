import {PromptCard, ResponseCard} from "./cards";

export const RANDO_CARDRISSIAN = "rando-cardrissian";

export type Player = {
    id: string;
    name: string;
    avatarUrl?: string;
    isRandoCardrissian: boolean;
    hand?: ResponseCard[];
    prizes?: PromptCard[];
}