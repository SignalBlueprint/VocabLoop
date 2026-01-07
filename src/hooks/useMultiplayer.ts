import { useState, useEffect, useCallback, useRef } from 'react';

// Types matching server protocol
export type RoomState = 'DISCONNECTED' | 'CONNECTING' | 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

export interface PlayerInfo {
  id: string;
  name: string;
  isCreator: boolean;
}

export interface GameCard {
  index: number;
  spanish: string;
}

export interface CardResult {
  spanish: string;
  english: string;
  player1Correct: boolean;
  player2Correct: boolean;
}

export interface AnswerResult {
  cardIndex: number;
  playerId: string;
  correct: boolean;
  points: number;
  correctAnswer: string;
}

export interface GameEndResult {
  winner: string | null;
  finalScores: Record<string, number>;
  cardResults: CardResult[];
}

export interface MultiplayerState {
  roomState: RoomState;
  roomCode: string | null;
  playerId: string | null;
  players: PlayerInfo[];
  cards: GameCard[];
  currentCardIndex: number;
  scores: Record<string, number>;
  timeRemaining: number;
  countdown: number;
  lastAnswerResult: AnswerResult | null;
  gameResult: GameEndResult | null;
  error: string | null;
}

const INITIAL_STATE: MultiplayerState = {
  roomState: 'DISCONNECTED',
  roomCode: null,
  playerId: null,
  players: [],
  cards: [],
  currentCardIndex: -1,
  scores: {},
  timeRemaining: 60,
  countdown: 0,
  lastAnswerResult: null,
  gameResult: null,
  error: null,
};

// WebSocket server URL - configurable via env
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export function useMultiplayer() {
  const [state, setState] = useState<MultiplayerState>(INITIAL_STATE);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Send a message to the server
  const send = useCallback((type: string, payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    setState((s) => ({ ...s, roomState: 'CONNECTING', error: null }));

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to multiplayer server');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (error) {
        console.error('Failed to parse server message:', error);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from multiplayer server');
      setState((s) => ({
        ...s,
        roomState: 'DISCONNECTED',
      }));
      socketRef.current = null;
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setState((s) => ({
        ...s,
        error: 'Connection error. Please try again.',
      }));
    };
  }, []);

  // Handle messages from server
  const handleServerMessage = useCallback((message: { type: string; payload: unknown }) => {
    switch (message.type) {
      case 'ROOM_CREATED': {
        const payload = message.payload as { roomCode: string; playerId: string };
        setState((s) => ({
          ...s,
          roomState: 'WAITING',
          roomCode: payload.roomCode,
          playerId: payload.playerId,
          players: [{ id: payload.playerId, name: '', isCreator: true }],
        }));
        break;
      }

      case 'ROOM_JOINED': {
        const payload = message.payload as { roomCode: string; playerId: string; players: PlayerInfo[] };
        setState((s) => ({
          ...s,
          roomState: 'WAITING',
          roomCode: payload.roomCode,
          playerId: payload.playerId,
          players: payload.players,
        }));
        break;
      }

      case 'PLAYER_JOINED': {
        const payload = message.payload as { player: PlayerInfo };
        setState((s) => ({
          ...s,
          players: [...s.players, payload.player],
        }));
        break;
      }

      case 'PLAYER_LEFT': {
        const payload = message.payload as { playerId: string };
        setState((s) => ({
          ...s,
          players: s.players.filter((p) => p.id !== payload.playerId),
        }));
        break;
      }

      case 'COUNTDOWN_START': {
        const payload = message.payload as { seconds: number };
        setState((s) => ({
          ...s,
          roomState: 'COUNTDOWN',
          countdown: payload.seconds,
        }));

        // Countdown timer
        let remaining = payload.seconds;
        const interval = setInterval(() => {
          remaining--;
          setState((s) => ({ ...s, countdown: remaining }));
          if (remaining <= 0) {
            clearInterval(interval);
          }
        }, 1000);
        break;
      }

      case 'GAME_START': {
        const payload = message.payload as { cards: GameCard[]; totalTime: number; cardTime: number };
        setState((s) => ({
          ...s,
          roomState: 'PLAYING',
          cards: payload.cards,
          timeRemaining: payload.totalTime,
          currentCardIndex: 0,
        }));
        break;
      }

      case 'CARD_SHOWN': {
        const payload = message.payload as { cardIndex: number; timeRemaining: number };
        setState((s) => ({
          ...s,
          currentCardIndex: payload.cardIndex,
          timeRemaining: payload.timeRemaining,
          lastAnswerResult: null, // Clear previous answer result
        }));
        break;
      }

      case 'ANSWER_RESULT': {
        const payload = message.payload as AnswerResult;
        setState((s) => ({
          ...s,
          lastAnswerResult: payload,
        }));
        break;
      }

      case 'SCORES_UPDATE': {
        const payload = message.payload as { scores: Record<string, number> };
        setState((s) => ({
          ...s,
          scores: payload.scores,
        }));
        break;
      }

      case 'GAME_END': {
        const payload = message.payload as GameEndResult;
        setState((s) => ({
          ...s,
          roomState: 'FINISHED',
          gameResult: payload,
        }));
        break;
      }

      case 'ERROR': {
        const payload = message.payload as { code: string; message: string };
        setState((s) => ({
          ...s,
          error: payload.message,
        }));
        break;
      }
    }
  }, []);

  // Create a new room
  const createRoom = useCallback((playerName: string) => {
    connect();
    // Wait for connection before sending
    const checkAndSend = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        send('CREATE_ROOM', { playerName });
      } else {
        setTimeout(checkAndSend, 100);
      }
    };
    checkAndSend();
  }, [connect, send]);

  // Join an existing room
  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    connect();
    // Wait for connection before sending
    const checkAndSend = () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        send('JOIN_ROOM', { roomCode: roomCode.toUpperCase(), playerName });
      } else {
        setTimeout(checkAndSend, 100);
      }
    };
    checkAndSend();
  }, [connect, send]);

  // Start the game (creator only)
  const startGame = useCallback(() => {
    if (state.roomCode) {
      send('START_GAME', { roomCode: state.roomCode });
    }
  }, [send, state.roomCode]);

  // Submit an answer
  const submitAnswer = useCallback((answer: string) => {
    if (state.roomCode && state.currentCardIndex >= 0) {
      send('SUBMIT_ANSWER', {
        roomCode: state.roomCode,
        cardIndex: state.currentCardIndex,
        answer,
      });
    }
  }, [send, state.roomCode, state.currentCardIndex]);

  // Leave the room
  const leaveRoom = useCallback(() => {
    if (state.roomCode) {
      send('LEAVE_ROOM', { roomCode: state.roomCode });
    }
    setState(INITIAL_STATE);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, [send, state.roomCode]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setState(INITIAL_STATE);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  // Reset state for new game
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Get current player info
  const currentPlayer = state.players.find((p) => p.id === state.playerId);
  const opponent = state.players.find((p) => p.id !== state.playerId);
  const isCreator = currentPlayer?.isCreator ?? false;
  const myScore = state.playerId ? state.scores[state.playerId] ?? 0 : 0;
  const opponentScore = opponent ? state.scores[opponent.id] ?? 0 : 0;

  return {
    // State
    ...state,
    currentPlayer,
    opponent,
    isCreator,
    myScore,
    opponentScore,

    // Actions
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    leaveRoom,
    disconnect,
    clearError,
    reset,
  };
}
