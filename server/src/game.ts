import type { Room, Player, ServerMessage, GameConfig, CardResult, PlayerInfo } from './types.js';
import { getGameCards, isAnswerCorrect } from './cards.js';
import { DEFAULT_CONFIG } from './types.js';
import crypto from 'crypto';

// Active rooms
const rooms = new Map<string, Room>();

// Player ID to room code mapping
const playerRooms = new Map<string, string>();

/**
 * Generate a random room code
 */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusable chars
  let code = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Generate a player ID
 */
function generatePlayerId(): string {
  return `player_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Send a message to a player
 */
function send(player: Player, message: ServerMessage): void {
  if (player.socket.readyState === 1) { // WebSocket.OPEN
    player.socket.send(JSON.stringify(message));
  }
}

/**
 * Broadcast a message to all players in a room
 */
function broadcast(room: Room, message: ServerMessage): void {
  for (const player of room.players.values()) {
    send(player, message);
  }
}

/**
 * Get player info without socket
 */
function getPlayerInfo(player: Player): PlayerInfo {
  return {
    id: player.id,
    name: player.name,
    isCreator: player.isCreator,
  };
}

/**
 * Get current scores for a room
 */
function getScores(room: Room): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const player of room.players.values()) {
    scores[player.id] = player.score;
  }
  return scores;
}

/**
 * Create a new room
 */
export function createRoom(playerName: string, socket: import('ws').WebSocket): { roomCode: string; playerId: string } {
  const roomCode = generateRoomCode();
  const playerId = generatePlayerId();

  const player: Player = {
    id: playerId,
    name: playerName,
    socket,
    isCreator: true,
    score: 0,
    answeredCards: new Set(),
  };

  const room: Room = {
    code: roomCode,
    state: 'WAITING',
    players: new Map([[playerId, player]]),
    creatorId: playerId,
    cards: [],
    currentCardIndex: -1,
    startTime: null,
    endTime: null,
    cardResults: [],
    gameTimer: null,
    cardTimer: null,
    createdAt: Date.now(),
  };

  rooms.set(roomCode, room);
  playerRooms.set(playerId, roomCode);

  send(player, {
    type: 'ROOM_CREATED',
    payload: { roomCode, playerId },
  });

  return { roomCode, playerId };
}

/**
 * Join an existing room
 */
export function joinRoom(
  roomCode: string,
  playerName: string,
  socket: import('ws').WebSocket
): { success: boolean; error?: string; playerId?: string } {
  const room = rooms.get(roomCode);

  if (!room) {
    return { success: false, error: 'ROOM_NOT_FOUND' };
  }

  if (room.state !== 'WAITING') {
    return { success: false, error: 'GAME_IN_PROGRESS' };
  }

  if (room.players.size >= 2) {
    return { success: false, error: 'ROOM_FULL' };
  }

  const playerId = generatePlayerId();

  const player: Player = {
    id: playerId,
    name: playerName,
    socket,
    isCreator: false,
    score: 0,
    answeredCards: new Set(),
  };

  room.players.set(playerId, player);
  playerRooms.set(playerId, roomCode);

  // Send ROOM_JOINED to the joining player
  const allPlayers = Array.from(room.players.values()).map(getPlayerInfo);
  send(player, {
    type: 'ROOM_JOINED',
    payload: { roomCode, playerId, players: allPlayers },
  });

  // Broadcast PLAYER_JOINED to existing players
  for (const [id, p] of room.players) {
    if (id !== playerId) {
      send(p, {
        type: 'PLAYER_JOINED',
        payload: { player: getPlayerInfo(player) },
      });
    }
  }

  return { success: true, playerId };
}

/**
 * Start the game
 */
export function startGame(roomCode: string, playerId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomCode);

  if (!room) {
    return { success: false, error: 'ROOM_NOT_FOUND' };
  }

  if (room.creatorId !== playerId) {
    return { success: false, error: 'NOT_CREATOR' };
  }

  if (room.players.size < 2) {
    return { success: false, error: 'NOT_ENOUGH_PLAYERS' };
  }

  if (room.state !== 'WAITING') {
    return { success: false, error: 'GAME_ALREADY_STARTED' };
  }

  // Start countdown
  room.state = 'COUNTDOWN';
  broadcast(room, {
    type: 'COUNTDOWN_START',
    payload: { seconds: DEFAULT_CONFIG.countdownTime },
  });

  // Start game after countdown
  setTimeout(() => {
    beginGame(room);
  }, DEFAULT_CONFIG.countdownTime * 1000);

  return { success: true };
}

/**
 * Begin the actual game after countdown
 */
function beginGame(room: Room): void {
  // Get cards for the game
  const cardCount = Math.floor(DEFAULT_CONFIG.totalTime / DEFAULT_CONFIG.cardTime);
  room.cards = getGameCards(cardCount);
  room.state = 'PLAYING';
  room.startTime = Date.now();
  room.currentCardIndex = 0;

  // Initialize card results
  room.cardResults = room.cards.map((card) => ({
    spanish: card.spanish,
    english: card.english[0],
    player1Correct: false,
    player2Correct: false,
  }));

  // Send GAME_START with cards (without answers)
  const cardsForClient = room.cards.map((c) => ({ index: c.index, spanish: c.spanish }));
  broadcast(room, {
    type: 'GAME_START',
    payload: {
      cards: cardsForClient,
      totalTime: DEFAULT_CONFIG.totalTime,
      cardTime: DEFAULT_CONFIG.cardTime,
    },
  });

  // Show first card
  showNextCard(room);

  // Set game end timer
  room.gameTimer = setTimeout(() => {
    endGame(room);
  }, DEFAULT_CONFIG.totalTime * 1000);
}

/**
 * Show the next card
 */
function showNextCard(room: Room): void {
  if (room.state !== 'PLAYING' || room.currentCardIndex >= room.cards.length) {
    return;
  }

  const timeRemaining = room.startTime
    ? Math.max(0, DEFAULT_CONFIG.totalTime - Math.floor((Date.now() - room.startTime) / 1000))
    : DEFAULT_CONFIG.totalTime;

  broadcast(room, {
    type: 'CARD_SHOWN',
    payload: {
      cardIndex: room.currentCardIndex,
      timeRemaining,
    },
  });

  // Schedule next card
  room.cardTimer = setTimeout(() => {
    room.currentCardIndex++;
    if (room.currentCardIndex < room.cards.length && room.state === 'PLAYING') {
      showNextCard(room);
    }
  }, DEFAULT_CONFIG.cardTime * 1000);
}

/**
 * Submit an answer
 */
export function submitAnswer(
  roomCode: string,
  playerId: string,
  cardIndex: number,
  answer: string
): void {
  const room = rooms.get(roomCode);
  if (!room || room.state !== 'PLAYING') return;

  const player = room.players.get(playerId);
  if (!player) return;

  // Check if already answered this card
  if (player.answeredCards.has(cardIndex)) return;

  // Check if valid card index
  if (cardIndex < 0 || cardIndex >= room.cards.length) return;

  const card = room.cards[cardIndex];
  const correct = isAnswerCorrect(card, answer);

  player.answeredCards.add(cardIndex);

  // Calculate points: first correct = 2, second correct = 1
  let points = 0;
  if (correct) {
    // Count how many players already answered correctly
    const playersArray = Array.from(room.players.values());
    const playerIndex = playersArray.findIndex((p) => p.id === playerId);
    const otherPlayer = playersArray[1 - playerIndex];

    const otherAnsweredCorrectly = otherPlayer?.answeredCards.has(cardIndex) &&
      room.cardResults[cardIndex] &&
      (playerIndex === 0 ? room.cardResults[cardIndex].player2Correct : room.cardResults[cardIndex].player1Correct);

    points = otherAnsweredCorrectly ? 1 : 2;
    player.score += points;

    // Update card results
    if (room.cardResults[cardIndex]) {
      if (playerIndex === 0) {
        room.cardResults[cardIndex].player1Correct = true;
      } else {
        room.cardResults[cardIndex].player2Correct = true;
      }
    }
  }

  // Broadcast result
  broadcast(room, {
    type: 'ANSWER_RESULT',
    payload: {
      cardIndex,
      playerId,
      correct,
      points,
      correctAnswer: card.english[0],
    },
  });

  // Broadcast updated scores
  broadcast(room, {
    type: 'SCORES_UPDATE',
    payload: { scores: getScores(room) },
  });
}

/**
 * End the game
 */
function endGame(room: Room): void {
  room.state = 'FINISHED';
  room.endTime = Date.now();

  // Clear timers
  if (room.gameTimer) clearTimeout(room.gameTimer);
  if (room.cardTimer) clearTimeout(room.cardTimer);

  const finalScores = getScores(room);
  const playerIds = Object.keys(finalScores);

  // Determine winner
  let winner: string | null = null;
  if (playerIds.length === 2) {
    if (finalScores[playerIds[0]] > finalScores[playerIds[1]]) {
      winner = playerIds[0];
    } else if (finalScores[playerIds[1]] > finalScores[playerIds[0]]) {
      winner = playerIds[1];
    }
    // null = tie
  }

  broadcast(room, {
    type: 'GAME_END',
    payload: {
      winner,
      finalScores,
      cardResults: room.cardResults,
    },
  });

  // Clean up room after a delay
  setTimeout(() => {
    cleanupRoom(room.code);
  }, 60000); // Keep room for 1 minute after game ends
}

/**
 * Handle player leaving
 */
export function leaveRoom(playerId: string): void {
  const roomCode = playerRooms.get(playerId);
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  const player = room.players.get(playerId);
  if (!player) return;

  room.players.delete(playerId);
  playerRooms.delete(playerId);

  // Notify other players
  broadcast(room, {
    type: 'PLAYER_LEFT',
    payload: { playerId },
  });

  // If game was in progress, end it
  if (room.state === 'PLAYING' || room.state === 'COUNTDOWN') {
    endGame(room);
  }

  // If room is empty, clean it up
  if (room.players.size === 0) {
    cleanupRoom(roomCode);
  }
}

/**
 * Handle player disconnection
 */
export function handleDisconnect(socket: import('ws').WebSocket): void {
  // Find player by socket
  for (const [playerId, roomCode] of playerRooms) {
    const room = rooms.get(roomCode);
    if (room) {
      const player = room.players.get(playerId);
      if (player && player.socket === socket) {
        leaveRoom(playerId);
        return;
      }
    }
  }
}

/**
 * Clean up a room
 */
function cleanupRoom(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  // Clear timers
  if (room.gameTimer) clearTimeout(room.gameTimer);
  if (room.cardTimer) clearTimeout(room.cardTimer);

  // Remove player mappings
  for (const playerId of room.players.keys()) {
    playerRooms.delete(playerId);
  }

  rooms.delete(roomCode);
}

/**
 * Get room by player ID
 */
export function getRoomByPlayer(playerId: string): Room | undefined {
  const roomCode = playerRooms.get(playerId);
  if (!roomCode) return undefined;
  return rooms.get(roomCode);
}

/**
 * Send error to player
 */
export function sendError(socket: import('ws').WebSocket, code: string, message: string): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      type: 'ERROR',
      payload: { code, message },
    }));
  }
}
