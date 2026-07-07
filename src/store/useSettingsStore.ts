/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { PlayerSettings } from '../types';
import { db } from '../database/db';

interface SettingsState extends PlayerSettings {
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof PlayerSettings>(key: K, value: PlayerSettings[K]) => Promise<void>;
}

const defaultSettings: PlayerSettings = {
  theme: 'dark',
  accentColor: '#9333EA', // Indigo/Purple accent
  visualizerStyle: 'bars',
  audioQuality: 'high',
  libraryLocations: [],
  autoScan: true,
  playbackSpeed: 1.0,
  volume: 0.8,
  isMuted: false,
  shuffle: false,
  repeat: 'all',

  // Advanced audio settings defaults
  eqEnabled: false,
  eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  eqPreset: 'Flat',
  bassBoost: 0,
  compressorEnabled: false,
  crossfadeDuration: 4,
  replayGainMode: 'off',

  // Desktop and library settings defaults
  notificationsEnabled: true,
  accessibilityHighContrast: false,
  accessibilityReducedMotion: false,
  accessibilityKeyboardOnly: false,
  accessibilityUiScale: 1.0,
  customShortcuts: {
    'TogglePlay': 'Space',
    'NextTrack': 'Control+ArrowRight',
    'PrevTrack': 'Control+ArrowLeft',
    'VolumeUp': 'ArrowUp',
    'VolumeDown': 'ArrowDown',
    'Mute': 'KeyM',
    'OpenSearch': 'Control+KeyK'
  },
  pluginsEnabled: []
};

export const useSettingsStore = create<SettingsState>((set) => ({
  ...defaultSettings,

  loadSettings: async () => {
    try {
      const stored = await db.getSettings();
      set({
        ...defaultSettings,
        ...stored,
      });
    } catch (e) {
      console.error('Failed to load settings from DB:', e);
    }
  },

  updateSetting: async (key, value) => {
    set({ [key]: value } as any);
    try {
      await db.saveSetting(key, value);
    } catch (e) {
      console.error(`Failed to persist setting ${key} to DB:`, e);
    }
  },
}));
