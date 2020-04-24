export const COLLECTION_USERS = 'users';
export const COLLECTION_DEVICES = 'devices';
export const COLLECTION_CARD_SETS = 'cardSets';
export const COLLECTION_PROMPTS = 'prompts';
export const COLLECTION_RESPONSES = 'responses';
export const COLLECTION_GAMES = 'games';
export const COLLECTION_PLAYERS = 'players';
export const COLLECTION_CARD_POOL = 'cards';

// CAVEAT: These _HAVE_ to be singular (not COLLECTION_ variant above) so that when we seed a game we can do a
//         Collection Group query without interference
export const DOCUMENT_PROMPTS = 'prompt';
export const DOCUMENT_RESPONSES = 'response';