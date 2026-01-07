import { useEffect, useMemo } from 'react';
import type { Page } from '../types';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { saveMatchResult } from '../utils/matchHistory';

interface MultiplayerResultsProps {
  onNavigate: (page: Page) => void;
  isDark: boolean;
}

export function MultiplayerResults({ onNavigate, isDark }: MultiplayerResultsProps) {
  const {
    gameResult,
    currentPlayer,
    opponent,
    playerId,
    reset,
  } = useMultiplayer();

  const myFinalScore = playerId && gameResult?.finalScores ? gameResult.finalScores[playerId] ?? 0 : 0;
  const opponentId = opponent?.id;
  const opponentFinalScore = opponentId && gameResult?.finalScores ? gameResult.finalScores[opponentId] ?? 0 : 0;

  // Determine outcome
  const outcome = useMemo(() => {
    if (!gameResult) return null;
    if (gameResult.winner === null) return 'tie';
    if (gameResult.winner === playerId) return 'win';
    return 'loss';
  }, [gameResult, playerId]);

  // Save match result to history
  useEffect(() => {
    if (gameResult && playerId && currentPlayer) {
      saveMatchResult({
        date: Date.now(),
        myName: currentPlayer.name,
        opponentName: opponent?.name || 'Unknown',
        myScore: myFinalScore,
        opponentScore: opponentFinalScore,
        outcome: outcome || 'tie',
        cardResults: gameResult.cardResults,
      });
    }
  }, [gameResult, playerId, currentPlayer, opponent, myFinalScore, opponentFinalScore, outcome]);

  const handlePlayAgain = () => {
    reset();
    onNavigate('multiplayer-lobby');
  };

  const handleGoHome = () => {
    reset();
    onNavigate('home');
  };

  if (!gameResult) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-4 pb-20`}>
      {/* Result banner */}
      <div className={`rounded-2xl p-8 text-center mb-6 ${
        outcome === 'win'
          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
          : outcome === 'loss'
            ? 'bg-gradient-to-br from-gray-600 to-gray-700'
            : 'bg-gradient-to-br from-amber-500 to-amber-600'
      }`}>
        <div className="text-5xl mb-4">
          {outcome === 'win' ? '🏆' : outcome === 'loss' ? '😔' : '🤝'}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {outcome === 'win' ? 'You Won!' : outcome === 'loss' ? 'You Lost' : "It's a Tie!"}
        </h1>
        <p className="text-white/80">
          {outcome === 'win'
            ? 'Great job! Your vocabulary skills are on fire!'
            : outcome === 'loss'
              ? "Don't worry, you'll get them next time!"
              : 'An evenly matched battle!'}
        </p>
      </div>

      {/* Score comparison */}
      <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Final Score
        </h2>
        <div className="flex items-center justify-around">
          {/* My score */}
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-2 ${
              myFinalScore > opponentFinalScore ? 'bg-emerald-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}>
              {myFinalScore}
            </div>
            <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {currentPlayer?.name || 'You'}
            </p>
          </div>

          {/* Separator */}
          <div className={`text-2xl font-bold ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
            -
          </div>

          {/* Opponent score */}
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-2 ${
              opponentFinalScore > myFinalScore ? 'bg-blue-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}>
              {opponentFinalScore}
            </div>
            <p className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {opponent?.name || 'Opponent'}
            </p>
          </div>
        </div>
      </div>

      {/* Card results breakdown */}
      <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Word Breakdown
        </h2>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {gameResult.cardResults.map((result, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}
            >
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {result.spanish}
                </p>
                <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {result.english}
                </p>
              </div>
              <div className="flex gap-1">
                {/* Player 1 (me) indicator */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                    result.player1Correct
                      ? 'bg-emerald-500 text-white'
                      : isDark ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-400'
                  }`}
                  title={`${currentPlayer?.name || 'You'}: ${result.player1Correct ? 'Correct' : 'Missed'}`}
                >
                  {result.player1Correct ? '✓' : '✗'}
                </div>
                {/* Player 2 (opponent) indicator */}
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                    result.player2Correct
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-gray-600 text-gray-400' : 'bg-gray-200 text-gray-400'
                  }`}
                  title={`${opponent?.name || 'Opponent'}: ${result.player2Correct ? 'Correct' : 'Missed'}`}
                >
                  {result.player2Correct ? '✓' : '✗'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats summary */}
      <div className={`rounded-xl p-6 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Your Stats
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {gameResult.cardResults.filter(r => r.player1Correct).length}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Correct</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {gameResult.cardResults.length}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Cards</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
              {Math.round((gameResult.cardResults.filter(r => r.player1Correct).length / gameResult.cardResults.length) * 100) || 0}%
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Accuracy</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={handlePlayAgain}
          className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-lg transition-colors"
        >
          Play Again
        </button>
        <button
          onClick={handleGoHome}
          className={`w-full py-4 rounded-xl font-medium text-lg transition-colors border-2 ${
            isDark
              ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
