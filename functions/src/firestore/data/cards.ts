import {COLLECTION_CARD_SETS, COLLECTION_PROMPTS, COLLECTION_RESPONSES} from '../constants';
import {PromptCard, ResponseCard, CardSet} from "../../models/cards";
import {chunkArray} from "../../util/chunk";
import {firestore} from "../firestore";
import * as admin from "firebase-admin";
import FieldPath = admin.firestore.FieldPath;

/**
 * Get the {@link CardSet} for a given identifier
 * @param ids the list of card set ids to fetch
 */
export async function getCardSet(...ids: string[]): Promise<CardSet[]> {
    if (ids.length <= 10) {
        return getCardSetsLimited(ids);
    } else {
        const cardSets: CardSet[] = [];
        const chunks = chunkArray(ids, 10);
        for (const chunk of chunks) {
            const chunkSets = await getCardSetsLimited(chunk);
            cardSets.push(...chunkSets);
        }
        return cardSets
    }
}

/**
 * Return an array of {@link ResponseCard} objects that were searched for via their index hash across all
 * sets.
 *
 * CAVEAT: Do to how the cards are hashed this may return cards from other sets then they were originally intended
 *         to be sourced from since the index is just `sha256(card.text)`. In the future, we should probably adjust
 *         this algorithm to be `sha256(set.id + card.text)`. This should really have an impact on gameplay since the
 *         player won't be aware of where their cards are from, but it could impact how we are managing id's
 *
 * @param ids the list of response card ids/indexes to fetch
 */
export async function getResponseCards(ids: string[]): Promise<ResponseCard[]> {
    const querySnap = await firestore.collectionGroup(COLLECTION_RESPONSES)
        .where('cid', 'in', ids)
        .get();

    return querySnap.docs.map((snapshot) => snapshot.data() as ResponseCard)
}

/**
 * Return a single {@link PromptCard} for the given {id}
 * @param id the id of the prompt card you wish to fetch
 */
export async function getPromptCard(id: string): Promise<PromptCard> {
    const querySnap = await firestore.collectionGroup(COLLECTION_PROMPTS)
        .where('cid', '==', id)
        .limit(1)
        .get();

    return querySnap.docs.map((snapshot) => snapshot.data() as PromptCard)[0]
}

async function getCardSetsLimited(ids: string[]): Promise<CardSet[]> {
    let cardSetIds = ids;
    if (ids.length > 10) cardSetIds = ids.slice(0, 10);

    const cardSetQuerySnap = await firestore.collection(COLLECTION_CARD_SETS)
        .where(FieldPath.documentId(), 'in', cardSetIds)
        .get();

    return cardSetQuerySnap.docs
        .map((snapshot) => snapshot.data() as CardSet);
}