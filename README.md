# Apps Against Humanity - Firebase

## Functions

**Location:** `/functions`

### `startGame({'game_id': 'some_game_id'})`

This function is a Callable HTTPS function for seeding the start of a game. It will take the initialized set of card sets and pull a random selection of cards to seed the game with. It will then generate the first turn, and deal the cards from the pool to all the players.

### `pickWinner({'game_id': 'some_game_id', 'player_id': 'winning_player_id}`

This function is a Callable HTTPS function for the judge to pick the winner of the turn with.