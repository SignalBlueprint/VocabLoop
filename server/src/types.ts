import type { WebSocket } from 'ws';

// Room states
export type RoomState = 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

// Player info
export interface Player {
  id: string;
  name: string;
  socket: WebSocket;
  isCreator: boolean;
  score: number;
  answeredCards: Set<number>;
}

// Card for the game
export interface GameCard {
  index: number;
  spanish: string;
  english: string[];  // Multiple accepted translations
}

// Room
export interface Room {
  code: string;
  state: RoomState;
  players: Map<string, Player>;
  creatorId: string;
  cards: GameCard[];
  currentCardIndex: number;
  startTime: number | null;
  endTime: number | null;
  cardResults: CardResult[];
  gameTimer: NodeJS.Timeout | null;
  cardTimer: NodeJS.Timeout | null;
  createdAt: number;
}

// Card result for end of game
export interface CardResult {
  spanish: string;
  english: string;
  player1Correct: boolean;
  player2Correct: boolean;
}

// Client -> Server messages
export type ClientMessage =
  | { type: 'CREATE_ROOM'; payload: { playerName: string } }
  | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string } }
  | { type: 'START_GAME'; payload: { roomCode: string } }
  | { type: 'SUBMIT_ANSWER'; payload: { roomCode: string; cardIndex: number; answer: string } }
  | { type: 'LEAVE_ROOM'; payload: { roomCode: string } };

// Server -> Client messages
export type ServerMessage =
  | { type: 'ROOM_CREATED'; payload: { roomCode: string; playerId: string } }
  | { type: 'ROOM_JOINED'; payload: { roomCode: string; playerId: string; players: PlayerInfo[] } }
  | { type: 'PLAYER_JOINED'; payload: { player: PlayerInfo } }
  | { type: 'PLAYER_LEFT'; payload: { playerId: string } }
  | { type: 'COUNTDOWN_START'; payload: { seconds: number } }
  | { type: 'GAME_START'; payload: { cards: { index: number; spanish: string }[]; totalTime: number; cardTime: number } }
  | { type: 'CARD_SHOWN'; payload: { cardIndex: number; timeRemaining: number } }
  | { type: 'ANSWER_RESULT'; payload: { cardIndex: number; playerId: string; correct: boolean; points: number; correctAnswer: string } }
  | { type: 'SCORES_UPDATE'; payload: { scores: Record<string, number> } }
  | { type: 'GAME_END'; payload: { winner: string | null; finalScores: Record<string, number>; cardResults: CardResult[] } }
  | { type: 'ERROR'; payload: { code: string; message: string } };

// Player info sent to clients (without socket)
export interface PlayerInfo {
  id: string;
  name: string;
  isCreator: boolean;
}

// Configuration
export interface GameConfig {
  totalTime: number;      // Total game duration in seconds
  cardTime: number;       // Time per card in seconds
  countdownTime: number;  // Countdown before game starts
}

export const DEFAULT_CONFIG: GameConfig = {
  totalTime: 60,
  cardTime: 5,
  countdownTime: 3,
};
