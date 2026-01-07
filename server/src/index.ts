import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage } from './types.js';
import {
  createRoom,
  joinRoom,
  startGame,
  submitAnswer,
  leaveRoom,
  handleDisconnect,
  sendError,
} from './game.js';

const PORT = parseInt(process.env.PORT || '3001', 10);

const wss = new WebSocketServer({ port: PORT });

console.log(`VocabLoop Multiplayer Server listening on port ${PORT}`);

wss.on('connection', (socket: WebSocket) => {
  console.log('Client connected');

  socket.on('message', (data: Buffer) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleMessage(socket, message);
    } catch (error) {
      console.error('Invalid message:', error);
      sendError(socket, 'INVALID_MESSAGE', 'Could not parse message');
    }
  });

  socket.on('close', () => {
    console.log('Client disconnected');
    handleDisconnect(socket);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function handleMessage(socket: WebSocket, message: ClientMessage): void {
  switch (message.type) {
    case 'CREATE_ROOM': {
      const { playerName } = message.payload;
      if (!playerName || playerName.trim().length === 0) {
        sendError(socket, 'INVALID_NAME', 'Player name is required');
        return;
      }
      createRoom(playerName.trim(), socket);
      break;
    }

    case 'JOIN_ROOM': {
      const { roomCode, playerName } = message.payload;
      if (!playerName || playerName.trim().length === 0) {
        sendError(socket, 'INVALID_NAME', 'Player name is required');
        return;
      }
      if (!roomCode || roomCode.length !== 6) {
        sendError(socket, 'INVALID_ROOM_CODE', 'Room code must be 6 characters');
        return;
      }
      const result = joinRoom(roomCode.toUpperCase(), playerName.trim(), socket);
      if (!result.success) {
        sendError(socket, result.error || 'JOIN_FAILED', `Could not join room: ${result.error}`);
      }
      break;
    }

    case 'START_GAME': {
      const { roomCode } = message.payload;
      // Find player ID by socket (simplified - in production, track this properly)
      const playerId = findPlayerIdBySocket(socket);
      if (!playerId) {
        sendError(socket, 'NOT_IN_ROOM', 'You are not in a room');
        return;
      }
      const result = startGame(roomCode, playerId);
      if (!result.success) {
        sendError(socket, result.error || 'START_FAILED', `Could not start game: ${result.error}`);
      }
      break;
    }

    case 'SUBMIT_ANSWER': {
      const { roomCode, cardIndex, answer } = message.payload;
      const playerId = findPlayerIdBySocket(socket);
      if (!playerId) {
        sendError(socket, 'NOT_IN_ROOM', 'You are not in a room');
        return;
      }
      submitAnswer(roomCode, playerId, cardIndex, answer);
      break;
    }

    case 'LEAVE_ROOM': {
      const playerId = findPlayerIdBySocket(socket);
      if (playerId) {
        leaveRoom(playerId);
      }
      break;
    }

    default:
      sendError(socket, 'UNKNOWN_MESSAGE', 'Unknown message type');
  }
}

// Track socket to player ID mapping
const socketToPlayer = new Map<WebSocket, string>();

// Patch createRoom and joinRoom to track socket mapping
const originalCreateRoom = createRoom;
(globalThis as { createRoom?: typeof createRoom }).createRoom = function(
  playerName: string,
  socket: WebSocket
): ReturnType<typeof originalCreateRoom> {
  const result = originalCreateRoom(playerName, socket);
  socketToPlayer.set(socket, result.playerId);
  return result;
};

// Find player ID by socket
function findPlayerIdBySocket(socket: WebSocket): string | undefined {
  return socketToPlayer.get(socket);
}

// Clean up on disconnect
const originalHandleDisconnect = handleDisconnect;
const wrappedHandleDisconnect = (socket: WebSocket): void => {
  socketToPlayer.delete(socket);
  originalHandleDisconnect(socket);
};

// Override the export
Object.assign(module || {}, { handleDisconnect: wrappedHandleDisconnect });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});
