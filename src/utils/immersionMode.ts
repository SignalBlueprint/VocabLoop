// Immersion mode settings - hide English translations for deeper learning

const IMMERSION_KEY = 'vocabloop_immersion_mode';

interface ImmersionSettings {
  enabled: boolean;
  hideInReview: boolean;
  hideInLibrary: boolean;
  hideHints: boolean;
}

const DEFAULT_SETTINGS: ImmersionSettings = {
  enabled: false,
  hideInReview: true,
  hideInLibrary: true,
  hideHints: false,
};

export function getImmersionSettings(): ImmersionSettings {
  const stored = localStorage.getItem(IMMERSION_KEY);
  if (!stored) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveImmersionSettings(settings: ImmersionSettings): void {
  localStorage.setItem(IMMERSION_KEY, JSON.stringify(settings));
}

export function isImmersionEnabled(): boolean {
  return getImmersionSettings().enabled;
}

export function toggleImmersionMode(): boolean {
  const settings = getImmersionSettings();
  settings.enabled = !settings.enabled;
  saveImmersionSettings(settings);
  return settings.enabled;
}
