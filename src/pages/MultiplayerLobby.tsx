import { useState } from 'react';
import type { Page } from '../types';
import { useMultiplayer } from '../hooks/useMultiplayer';

interface MultiplayerLobbyProps {
  onNavigate: (page: Page) => void;
  isDark: boolean;
  showToast: (message: string) => void;
}

export function MultiplayerLobby({ onNavigate, isDark, showToast }: MultiplayerLobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const {
    roomState,
    roomCode: currentRoomCode,
    players,
    isCreator,
    error,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    clearError,
  } = useMultiplayer();

  const handleCreate = () => {
    if (!playerName.trim()) {
      showToast('Please enter your name');
      return;
    }
    createRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      showToast('Please enter your name');
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      showToast('Please enter a valid 6-character room code');
      return;
    }
    joinRoom(roomCode.trim(), playerName.trim());
  };

  const handleCopyCode = () => {
    if (currentRoomCode) {
      navigator.clipboard.writeText(currentRoomCode);
      showToast('Room code copied!');
    }
  };

  // Show error toast
  if (error) {
    showToast(error);
    clearError();
  }

  // Navigate to game when countdown starts
  if (roomState === 'COUNTDOWN' || roomState === 'PLAYING') {
    onNavigate('multiplayer-game');
    return null;
  }

  return (
    <div className="p-4 pb-20">
      {/* Back button */}
      <button
        onClick={() => {
          leaveRoom();
          onNavigate('home');
        }}
        className={`mb-4 flex items-center gap-2 ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
        Multiplayer Sprint
      </h1>

      {/* Main menu */}
      {roomState === 'DISCONNECTED' && mode === 'menu' && (
        <div className="space-y-4">
          <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="text-4xl mb-4">🏃</div>
            <h2 className={`text-lg font-medium mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              Race to Translate!
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Compete against a friend in a 60-second vocabulary sprint.
              First correct answer gets 2 points!
            </p>
          </div>

          <button
            onClick={() => setMode('create')}
            className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-lg transition-colors"
          >
            Create Room
          </button>

          <button
            onClick={() => setMode('join')}
            className={`w-full py-4 rounded-xl font-medium text-lg transition-colors border-2 ${
              isDark
                ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Join Room
          </button>
        </div>
      )}

      {/* Create room form */}
      {roomState === 'DISCONNECTED' && mode === 'create' && (
        <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <button
            onClick={() => setMode('menu')}
            className={`mb-4 text-sm ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ← Back to menu
          </button>

          <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Create a Room
          </h2>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <button
            onClick={handleCreate}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            Create Room
          </button>
        </div>
      )}

      {/* Join room form */}
      {roomState === 'DISCONNECTED' && mode === 'join' && (
        <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <button
            onClick={() => setMode('menu')}
            className={`mb-4 text-sm ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ← Back to menu
          </button>

          <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Join a Room
          </h2>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABCXYZ"
              maxLength={6}
              className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-emerald-500 outline-none text-center text-2xl font-mono tracking-widest uppercase ${
                isDark
                  ? 'bg-gray-700 border-gray-600 text-gray-100'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <button
            onClick={handleJoin}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
          >
            Join Room
          </button>
        </div>
      )}

      {/* Connecting state */}
      {roomState === 'CONNECTING' && (
        <div className={`rounded-xl p-6 text-center ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>Connecting...</p>
        </div>
      )}

      {/* Waiting room */}
      {roomState === 'WAITING' && currentRoomCode && (
        <div className={`rounded-xl p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <h2 className={`text-lg font-medium mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            Waiting for Players
          </h2>

          {/* Room code */}
          <div className="mb-6">
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Share this code with a friend:
            </p>
            <div className="flex items-center gap-2">
              <div
                className={`flex-1 px-4 py-3 rounded-lg text-center text-3xl font-mono tracking-widest ${
                  isDark ? 'bg-gray-700 text-emerald-400' : 'bg-gray-100 text-emerald-600'
                }`}
              >
                {currentRoomCode}
              </div>
              <button
                onClick={handleCopyCode}
                className={`p-3 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="Copy code"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Players */}
          <div className="mb-6">
            <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Players ({players.length}/2)
            </p>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isDark ? 'bg-gray-700' : 'bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      player.isCreator ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                  >
                    {player.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {player.name || 'Player'}
                    </p>
                    {player.isCreator && (
                      <p className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Room Creator
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {players.length < 2 && (
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 border-dashed ${
                    isDark ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center">
                    ?
                  </div>
                  <p className="text-sm">Waiting for opponent...</p>
                </div>
              )}
            </div>
          </div>

          {/* Start button (creator only, when 2 players) */}
          {isCreator && (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                players.length >= 2
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : isDark
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {players.length >= 2 ? 'Start Game!' : 'Waiting for opponent...'}
            </button>
          )}

          {!isCreator && (
            <p className={`text-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Waiting for the room creator to start the game...
            </p>
          )}

          {/* Leave button */}
          <button
            onClick={() => {
              leaveRoom();
              setMode('menu');
            }}
            className={`w-full mt-4 py-2 rounded-lg text-sm transition-colors ${
              isDark
                ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            Leave Room
          </button>
        </div>
      )}

    </div>
  );
}
