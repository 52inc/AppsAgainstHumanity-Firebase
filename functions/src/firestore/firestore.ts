import * as admin from 'firebase-admin';
import * as games from './data/games';
import * as cards from './data/cards';
import * as players from './data/players';

// Hydrate our context of Firebase Admin SDK
admin.initializeApp();

const firestore = admin.firestore();

export { games, cards, players, firestore }