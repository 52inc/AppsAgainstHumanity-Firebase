# Apps Against Humanity - Firebase

## Functions

**Location:** `/functions`

### `startGame({'game_id': 'some_game_id'})`
**Type:** Callable HTTPS

Seed the start of a game. It will take the initialized set of card sets and pull a random selection of cards to seed the game with. It will then generate the first turn, and deal the cards from the pool to all the players.

### `pickWinner({'game_id': 'some_game_id', 'player_id': 'winning_player_id})`
**Type:** Callable HTTPS

Let's the judge pick the winner of the turn.

### `reDealHand({'game_id': 'some_game_id'})`
**Type:** Callable HTTPS

Exchange 1 prize card for a new hand.

### `downvotePrompt()`
**Type:** Firestore `onUpdate()`  
**Resource:** `games/{gameId}/downvotes/tally`

Check if there have been 2/3 majority downvotes on the current prompt card. If so, it will return any submitted responses and reset the turn with a new prompt maintaining the current judge.

### `accountDeletion()`
**Type:** Authentication `onDelete()`

If a user deletes his/her/they account, then delete all the user data from firestore as well as remove them from participating games.