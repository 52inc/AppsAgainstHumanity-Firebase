# Apps Against Humanity - Firebase

![CI](https://github.com/52inc/AppsAgainstHumanity-Firebase/workflows/CI/badge.svg)

## Functions

**Location:** `/functions`

### `startGame({'game_id': 'some_game_document_id'})`
**Type:** Callable HTTPS

Seed the start of a game. It will take the initialized set of card sets and pull a random selection of cards to seed the game with. It will then generate the first turn, and deal the cards from the pool to all the players.

---

### `joinGame({'gid': 'some_game_code', 'name': 'The name of player joining', 'avatar': 'the avatar image url of player'})`  
**Type:** Callable HTTPS

Join the game as a player, checking if the game is full yet and writing the appropriate documents

---

### `leaveGame({'game_id': 'some_game_document_id'})`
**Type:** Callable HTTPS

Leave a game and remove your reference to it in the past games list

---

### `kickPlayer({'game_id': 'some_game_document_id', 'player_id': 'some_player_id'})`
**Type:** Callable HTTPS

Kick a player out of your current game. This can only be called by the game owner.

---

### `pickWinner({'game_id': 'some_game_document_id', 'player_id': 'winning_player_id})`
**Type:** Callable HTTPS

Let's the judge pick the winner of the turn.

---

### `reDealHand({'game_id': 'some_game_document_id'})`
**Type:** Callable HTTPS

Exchange 1 prize card for a new hand.

---

### `wave({'game_id': 'some_game_document_id', 'player_id': 'player_to_wave_to_id', 'message': 'optional messsage to send'})`
**Type:** Callable HTTPS

Send a notification to a user, a wave if you will, to get them to re-engage with the game.

---

### `downvotePrompt()`
**Type:** Firestore `onUpdate()`  
**Resource:** `games/{gameId}/downvotes/tally`

Check if there have been 2/3 majority downvotes on the current prompt card. If so, it will return any submitted responses and reset the turn with a new prompt maintaining the current judge.

---

### `updateUserProfile()`  
**Type:** Firestore `onUpdate()`  
**Resource:** `users/{userId}`  

When a user updates their name or avatar url we need to retro update all of their Player objects on any games.

---

### `accountDeletion()`
**Type:** Authentication `onDelete()`

If a user deletes his/her/they account, then delete all the user data from firestore as well as remove them from participating games.
