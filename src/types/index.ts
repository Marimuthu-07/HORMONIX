/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Song {
  id: string;          // MD5/SHA-1 hash or unique ID
  title: string;       // Song title
  artist: string;      // Artist name
  album: string;       // Album name
  genre: string;       // Genre
  year?: number;       // Release year
  trackNumber?: number;// Track number in album
  duration: number;    // Duration in seconds
  format: string;      // mp3, wav, flac, etc.
  fileSize: number;    // Size in bytes
  addedAt: number;     // Timestamp of import
  playCount: number;   // Number of times played
  lastPlayedAt?: number;// Timestamp of last play
  favorite: boolean;   // Is favorited
  hasCover: boolean;   // Has embedded cover art
  coverArtUrl?: string;// Cached blob URL or local file path
  lyrics?: string;     // LRC or text lyrics
  filePath?: string;   // Full file system path or simulated path
  bitrate?: number;    // Encoding bitrate in kbps
  sampleRate?: number; // Sampling rate in Hz
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
  isSmart: boolean;
  smartRules?: string; // JSON string representing filters (e.g. "Most Played", "Recently Added")
  songsCount?: number;
}

export interface PlaylistSong {
  playlistId: string;
  songId: string;
  position: number;
}

export interface PlaybackHistory {
  id: string;
  songId: string;
  playedAt: number;
}

export interface PlayerSettings {
  theme: 'dark' | 'light' | 'amoled';
  accentColor: string; // Hex or tailwind color class
  visualizerStyle: 'bars' | 'waveform' | 'particles' | 'circular' | 'mirror' | 'nebula' | 'oscilloscope';
  audioQuality: 'high' | 'medium' | 'low';
  libraryLocations: string[];
  autoScan: boolean;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';

  // Advanced audio settings
  eqEnabled: boolean;
  eqGains: number[];
  eqPreset: string;
  bassBoost: number; // 0 to 10
  compressorEnabled: boolean;
  crossfadeDuration: number; // 0 to 12
  replayGainMode: 'off' | 'track' | 'album';

  // Desktop and library settings
  notificationsEnabled: boolean;
  accessibilityHighContrast: boolean;
  accessibilityReducedMotion: boolean;
  accessibilityKeyboardOnly: boolean;
  accessibilityUiScale: number; // 0.8 to 1.5
  customShortcuts: Record<string, string>;
  pluginsEnabled: string[];
}

export interface QueueItem {
  queueId: string;     // Unique ID for this specific entry in the queue (since the same song can be in the queue multiple times)
  song: Song;
}
