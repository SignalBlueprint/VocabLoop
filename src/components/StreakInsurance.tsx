import { useState } from 'react';
import { getStreakInsuranceStatus, useStreakInsurance } from '../utils/streakInsurance';
import { getTotalXP } from '../utils/xp';

interface StreakInsuranceProps {
  isDark: boolean;
  showToast: (message: string) => void;
  onStreakSaved?: () => void;
}

export function StreakInsuranceButton({ isDark, showToast, onStreakSaved }: StreakInsuranceProps) {
  const [showModal, setShowModal] = useState(false);
  const status = getStreakInsuranceStatus();
  const currentXP = getTotalXP();

  const handleUseInsurance = () => {
    const result = useStreakInsurance();
    if (result.success) {
      showToast(result.message);
      onStreakSaved?.();
    } else {
      showToast(result.message);
    }
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          status.canUse
            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
            : isDark
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        disabled={!status.canUse}
      >
        <span>🛡️</span>
        <span>Streak Insurance</span>
      </button>

      {showModal && (
        <StreakInsuranceModal
          isDark={isDark}
          status={status}
          currentXP={currentXP}
          onConfirm={handleUseInsurance}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

interface StreakInsuranceModalProps {
  isDark: boolean;
  status: ReturnType<typeof getStreakInsuranceStatus>;
  currentXP: number;
  onConfirm: () => void;
  onClose: () => void;
}

function StreakInsuranceModal({ isDark, status, currentXP, onConfirm, onClose }: StreakInsuranceModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-sm p-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="text-center mb-4">
          <span className="text-4xl">🛡️</span>
          <h2 className="text-xl font-bold mt-2">Streak Insurance</h2>
        </div>

        <div className={`space-y-3 mb-6 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <p className="text-center">
            Protect your streak! Use insurance to count today as a study day without reviewing.
          </p>

          <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <div className="flex justify-between items-center mb-2">
              <span>Cost:</span>
              <span className="font-bold text-amber-600">{status.cost} XP</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span>Your XP:</span>
              <span className={`font-bold ${currentXP >= status.cost ? 'text-emerald-500' : 'text-red-500'}`}>
                {currentXP} XP
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Uses left this week:</span>
              <span className={`font-bold ${status.usesRemaining > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {status.usesRemaining}
              </span>
            </div>
          </div>

          {status.reason && (
            <p className={`text-sm text-center ${isDark ? 'text-red-400' : 'text-red-500'}`}>
              {status.reason}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!status.canUse}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              status.canUse
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : isDark
                ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-gray-300 text-gray-400 cursor-not-allowed'
            }`}
          >
            Use Insurance
          </button>
        </div>
      </div>
    </div>
  );
}

interface StreakAtRiskBannerProps {
  isDark: boolean;
  showToast: (message: string) => void;
  onStreakSaved?: () => void;
}

export function StreakAtRiskBanner({ isDark, showToast, onStreakSaved }: StreakAtRiskBannerProps) {
  const [showModal, setShowModal] = useState(false);
  const status = getStreakInsuranceStatus();
  const currentXP = getTotalXP();

  const handleUseInsurance = () => {
    const result = useStreakInsurance();
    if (result.success) {
      showToast(result.message);
      onStreakSaved?.();
    } else {
      showToast(result.message);
    }
    setShowModal(false);
  };

  if (!status.canUse) return null;

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
          isDark
            ? 'bg-amber-900/20 border-amber-700/50 hover:bg-amber-900/30'
            : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div className="flex-1">
            <p className={`font-medium ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Streak at risk?
            </p>
            <p className={`text-sm ${isDark ? 'text-amber-500/80' : 'text-amber-600'}`}>
              Use insurance for {status.cost} XP to save your streak
            </p>
          </div>
          <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>→</span>
        </div>
      </div>

      {showModal && (
        <StreakInsuranceModal
          isDark={isDark}
          status={status}
          currentXP={currentXP}
          onConfirm={handleUseInsurance}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
