# VocabLoop Multiplayer Protocol

## Overview

Real-time multiplayer vocabulary sprint mode where two players compete to translate Spanish words fastest.

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Player 1  │◄──────────────────►│             │
│   Browser   │                    │  WebSocket  │
└─────────────┘                    │   Server    │
                                   │             │
┌─────────────┐     WebSocket      │  (Node.js)  │
│   Player 2  │◄──────────────────►│             │
│   Browser   │                    └─────────────┘
└─────────────┘
```

## Room State Machine

```
WAITING ──► COUNTDOWN ──► PLAYING ──► FINISHED
   │             │            │           │
   │             │            │           │
   ▼             ▼            ▼           ▼
 2 players    3 seconds    60 seconds   Results
 joined       countdown    gameplay     shown
```

### State Descriptions

- **WAITING**: Room created, waiting for second player to join
- **COUNTDOWN**: Both players ready, 3-second countdown before game starts
- **PLAYING**: Active gameplay, cards being shown and answers submitted
- **FINISHED**: Game over, showing final scores

## Message Types

### Client → Server

#### JOIN_ROOM
Player requests to join a room.
```json
{
  "type": "JOIN_ROOM",
  "payload": {
    "roomCode": "ABC123",
    "playerName": "María"
  }
}
```

#### CREATE_ROOM
Player requests to create a new room.
```json
{
  "type": "CREATE_ROOM",
  "payload": {
    "playerName": "Juan"
  }
}
```

#### START_GAME
Room creator starts the game (only valid when 2 players present).
```json
{
  "type": "START_GAME",
  "payload": {
    "roomCode": "ABC123"
  }
}
```

#### SUBMIT_ANSWER
Player submits an answer for the current card.
```json
{
  "type": "SUBMIT_ANSWER",
  "payload": {
    "roomCode": "ABC123",
    "cardIndex": 0,
    "answer": "house"
  }
}
```

#### LEAVE_ROOM
Player leaves the room.
```json
{
  "type": "LEAVE_ROOM",
  "payload": {
    "roomCode": "ABC123"
  }
}
```

### Server → Client

#### ROOM_CREATED
Confirms room creation with room code.
```json
{
  "type": "ROOM_CREATED",
  "payload": {
    "roomCode": "ABC123",
    "playerId": "player_abc123"
  }
}
```

#### ROOM_JOINED
Confirms player joined room.
```json
{
  "type": "ROOM_JOINED",
  "payload": {
    "roomCode": "ABC123",
    "playerId": "player_xyz789",
    "players": [
      { "id": "player_abc123", "name": "Juan", "isCreator": true },
      { "id": "player_xyz789", "name": "María", "isCreator": false }
    ]
  }
}
```

#### PLAYER_JOINED
Broadcast when another player joins.
```json
{
  "type": "PLAYER_JOINED",
  "payload": {
    "player": { "id": "player_xyz789", "name": "María", "isCreator": false }
  }
}
```

#### PLAYER_LEFT
Broadcast when a player leaves.
```json
{
  "type": "PLAYER_LEFT",
  "payload": {
    "playerId": "player_xyz789"
  }
}
```

#### COUNTDOWN_START
Game is about to begin.
```json
{
  "type": "COUNTDOWN_START",
  "payload": {
    "seconds": 3
  }
}
```

#### GAME_START
Game has started, includes all cards for the match.
```json
{
  "type": "GAME_START",
  "payload": {
    "cards": [
      { "index": 0, "spanish": "casa" },
      { "index": 1, "spanish": "perro" },
      { "index": 2, "spanish": "gato" }
    ],
    "totalTime": 60,
    "cardTime": 5
  }
}
```

#### CARD_SHOWN
Server advances to next card.
```json
{
  "type": "CARD_SHOWN",
  "payload": {
    "cardIndex": 1,
    "timeRemaining": 55
  }
}
```

#### ANSWER_RESULT
Result of a submitted answer.
```json
{
  "type": "ANSWER_RESULT",
  "payload": {
    "cardIndex": 0,
    "playerId": "player_abc123",
    "correct": true,
    "points": 2,
    "correctAnswer": "house"
  }
}
```

#### SCORES_UPDATE
Current scores update.
```json
{
  "type": "SCORES_UPDATE",
  "payload": {
    "scores": {
      "player_abc123": 10,
      "player_xyz789": 8
    }
  }
}
```

#### GAME_END
Game finished with final results.
```json
{
  "type": "GAME_END",
  "payload": {
    "winner": "player_abc123",
    "finalScores": {
      "player_abc123": 24,
      "player_xyz789": 18
    },
    "cardResults": [
      {
        "spanish": "casa",
        "english": "house",
        "player1Correct": true,
        "player2Correct": true
      },
      {
        "spanish": "difícil",
        "english": "difficult",
        "player1Correct": false,
        "player2Correct": false
      }
    ]
  }
}
```

#### ERROR
Error message.
```json
{
  "type": "ERROR",
  "payload": {
    "code": "ROOM_NOT_FOUND",
    "message": "Room ABC123 does not exist"
  }
}
```

## Scoring Rules

1. **First correct answer**: 2 points
2. **Second correct answer** (same card): 1 point
3. **Wrong answer**: 0 points
4. **No answer** (time expires): 0 points

## Timing

- **Match duration**: 60 seconds
- **Card display time**: 5 seconds per card
- **Cards per match**: ~12 cards
- **Countdown before start**: 3 seconds

## Anti-Cheat Considerations

1. **Server-authoritative answers**: Server validates all answers
2. **Timing validation**: Server tracks when cards are shown
3. **Answer hashing**: Future enhancement to prevent sniffing
4. **Rate limiting**: Max 1 answer per card per player

## Room Code Format

- 6 alphanumeric characters (uppercase)
- Example: `ABC123`, `XYZ789`
- Generated server-side using crypto.randomBytes

## Connection Handling

### Disconnection
- If a player disconnects during WAITING: room is cleaned up
- If a player disconnects during PLAYING: opponent wins by default
- Reconnection window: 10 seconds to rejoin with same playerId

### Timeouts
- Room expires after 5 minutes of inactivity in WAITING state
- Game auto-ends if no activity for 30 seconds during PLAYING

## Card Pool

Cards are loaded from a shared JSON file containing:
- Spanish word
- English translation(s) - multiple accepted
- Difficulty rating (1-5)

For initial implementation, cards selected randomly from pool.
Future: weighted selection based on players' known vocabulary.

## Error Codes

| Code | Description |
|------|-------------|
| ROOM_NOT_FOUND | Room code doesn't exist |
| ROOM_FULL | Room already has 2 players |
| NOT_IN_ROOM | Player not in specified room |
| NOT_CREATOR | Only room creator can start game |
| GAME_NOT_STARTED | Action requires game to be in progress |
| INVALID_ANSWER | Answer submitted for invalid card index |
| ALREADY_ANSWERED | Player already answered this card |
