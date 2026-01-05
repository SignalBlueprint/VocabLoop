import { useState, useRef, useEffect } from 'react';
import { getAllCards } from '../db/cards';
import { getAllReviews } from '../db/reviews';
import { calculateStreak } from '../utils/streak';
import { getMasteryStats } from '../utils/mastery';

interface ShareCardProps {
  isDark: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}

interface ShareStats {
  streak: number;
  totalCards: number;
  totalReviews: number;
  knownPercent: number;
  masteredPercent: number;
  activeDays: number;
}

export function ShareCard({ isDark, onClose, showToast }: ShareCardProps) {
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [cards, reviews, streak] = await Promise.all([
        getAllCards(),
        getAllReviews(),
        calculateStreak(),
      ]);

      // Calculate active days
      const uniqueDays = new Set(
        reviews.map(r => new Date(r.reviewedAt).toISOString().split('T')[0])
      );

      const masteryStats = getMasteryStats(cards);

      setStats({
        streak,
        totalCards: cards.length,
        totalReviews: reviews.length,
        knownPercent: masteryStats.percentKnown,
        masteredPercent: masteryStats.percentMastered,
        activeDays: uniqueDays.size,
      });
    } catch (error) {
      console.error('Failed to load share stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    // Use html2canvas if available, otherwise fall back to screenshot approach
    try {
      // Create a canvas manually for the card
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const width = 400;
      const height = 500;
      const dpr = 2; // For retina

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#059669'); // emerald-600
      gradient.addColorStop(1, '#065f46'); // emerald-800
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add decorative circles
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(350, 50, 100, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(50, 450, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Logo/App name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('VocabLoop', width / 2, 60);

      // Subtitle
      ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('Spanish Vocabulary Progress', width / 2, 85);

      if (stats) {
        // Streak section
        ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${stats.streak}`, width / 2, 180);
        ctx.font = '18px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText('day streak', width / 2, 210);

        // Stats cards
        const cardY = 260;
        const cardHeight = 70;
        const cardPadding = 15;

        // Row 1
        drawStatCard(ctx, 20, cardY, (width - 60) / 2, cardHeight, stats.totalCards.toString(), 'Cards');
        drawStatCard(ctx, 30 + (width - 60) / 2, cardY, (width - 60) / 2, cardHeight, stats.totalReviews.toString(), 'Reviews');

        // Row 2
        drawStatCard(ctx, 20, cardY + cardHeight + cardPadding, (width - 60) / 2, cardHeight, `${stats.knownPercent}%`, 'Known');
        drawStatCard(ctx, 30 + (width - 60) / 2, cardY + cardHeight + cardPadding, (width - 60) / 2, cardHeight, stats.activeDays.toString(), 'Active Days');

        // Footer
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('Made with VocabLoop', width / 2, height - 30);
        ctx.fillText(new Date().toLocaleDateString(), width / 2, height - 12);
      }

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    }
  };

  const handleShare = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) {
        showToast('Failed to generate image');
        return;
      }

      const file = new File([blob], 'vocabloop-progress.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My VocabLoop Progress',
          text: `I'm on a ${stats?.streak || 0} day streak learning Spanish!`,
        });
        showToast('Shared successfully!');
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vocabloop-progress.png';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Image downloaded!');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        showToast('Failed to share');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyStats = () => {
    if (!stats) return;

    const text = `🎯 My VocabLoop Spanish Progress:
🔥 ${stats.streak} day streak
📚 ${stats.totalCards} cards learned
✅ ${stats.totalReviews} reviews completed
💪 ${stats.knownPercent}% vocabulary known

Learn Spanish with VocabLoop!`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Stats copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy');
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`rounded-xl w-full max-w-md overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 id="share-modal-title" className="text-lg font-semibold">Share Progress</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>Loading stats...</p>
            </div>
          ) : (
            <>
              {/* Preview card */}
              <div
                ref={cardRef}
                className="rounded-xl overflow-hidden mb-4 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 relative"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                {/* Content */}
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold">VocabLoop</h3>
                    <p className="text-emerald-100 text-sm">Spanish Vocabulary Progress</p>
                  </div>

                  <div className="text-center mb-6">
                    <p className="text-5xl font-bold">{stats?.streak || 0}</p>
                    <p className="text-emerald-100">day streak</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{stats?.totalCards || 0}</p>
                      <p className="text-xs text-emerald-100">Cards</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{stats?.totalReviews || 0}</p>
                      <p className="text-xs text-emerald-100">Reviews</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{stats?.knownPercent || 0}%</p>
                      <p className="text-xs text-emerald-100">Known</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold">{stats?.activeDays || 0}</p>
                      <p className="text-xs text-emerald-100">Active Days</p>
                    </div>
                  </div>

                  <p className="text-center text-xs text-emerald-200 mt-4">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleShare}
                  disabled={isGenerating}
                  className="w-full bg-emerald-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? 'Generating...' : 'Share Image'}
                </button>
                <button
                  onClick={handleCopyStats}
                  className={`w-full py-3 px-4 rounded-lg font-medium border transition-colors ${
                    isDark
                      ? 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Copy Stats as Text
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to draw stat cards on canvas
function drawStatCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  label: string
) {
  // Card background
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 10);
  ctx.fill();

  // Value
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, x + width / 2, y + 35);

  // Label
  ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(label, x + width / 2, y + 55);
}
