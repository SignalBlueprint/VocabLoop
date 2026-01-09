/**
 * Vocabulary Badge Component
 *
 * Displays user's vocabulary stats as an embeddable badge.
 */

import { useState, useEffect } from 'react';
import type { BadgeConfig, VocabStats, WidgetTheme } from '../types';
import { getAPIClient } from '../utils/api';

interface VocabBadgeProps {
  config: Omit<BadgeConfig, 'container'>;
}

const defaultTheme: WidgetTheme = {
  primaryColor: '#10b981',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  borderRadius: 8,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export function VocabBadge({ config }: VocabBadgeProps) {
  const {
    size = 'compact',
    showStreak = true,
    animate = true,
    theme: customTheme,
  } = config;

  const theme = { ...defaultTheme, ...customTheme };

  const [stats, setStats] = useState<VocabStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const api = getAPIClient();

      if (!api.isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const result = await api.getStats();
        if (result.success && result.data) {
          setStats(result.data);
          if (animate) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 1000);
          }
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [animate]);

  if (loading) {
    return <div style={{ opacity: 0.5 }}>...</div>;
  }

  if (!stats) {
    return null;
  }

  // Icon size
  if (size === 'icon') {
    return (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: theme.borderRadius,
          backgroundColor: theme.primaryColor,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.fontFamily,
          fontSize: 12,
          fontWeight: 700,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          transform: animating ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease-out',
        }}
        title={`${stats.knownWords} words learned`}
      >
        {stats.knownWords > 999 ? `${Math.floor(stats.knownWords / 1000)}k` : stats.knownWords}
      </div>
    );
  }

  // Compact size
  if (size === 'compact') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: theme.borderRadius,
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          fontFamily: theme.fontFamily,
          fontSize: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            backgroundColor: theme.primaryColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          V
        </div>
        <span style={{ fontWeight: 600 }}>{stats.knownWords}</span>
        <span style={{ opacity: 0.6 }}>words</span>
        {showStreak && stats.streak > 0 && (
          <>
            <span style={{ opacity: 0.3 }}>|</span>
            <span style={{ opacity: 0.8 }}>🔥 {stats.streak}</span>
          </>
        )}
      </div>
    );
  }

  // Full size
  return (
    <div
      style={{
        width: 200,
        padding: 16,
        borderRadius: theme.borderRadius,
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: theme.primaryColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          V
        </div>
        <div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>VocabLoop</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Level {stats.level}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div
          style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: '#f3f4f6',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.primaryColor }}>
            {stats.knownWords}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Known</div>
        </div>
        <div
          style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: '#f3f4f6',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>
            {stats.masteredWords}
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>Mastered</div>
        </div>
      </div>

      {/* Streak */}
      {showStreak && stats.streak > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: 8,
            borderRadius: 6,
            backgroundColor: '#fef3c7',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span>🔥</span>
          <span style={{ fontWeight: 600 }}>{stats.streak} day streak</span>
        </div>
      )}

      {/* Footer */}
      <a
        href="https://vocabloop.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          marginTop: 12,
          fontSize: 11,
          textAlign: 'center',
          color: theme.primaryColor,
          textDecoration: 'none',
        }}
      >
        Powered by VocabLoop
      </a>
    </div>
  );
}
