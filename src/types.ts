export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  file?: File;
  url: string; // Blob URL or path
  coverUrl?: string; // Blob URL or image path
  format: 'MP3' | 'FLAC' | 'WAV' | 'M4A' | 'SYNTH' | string;
  sampleRate?: string;
  bitDepth?: string;
  bitrate?: string;
  size?: string;
}

export interface Theme {
  id: string;
  name: string;
  primary: string;     // Hex or class
  secondary: string;   // Hex or class
  accent: string;      // Hex or class
  glow: string;        // Tailwind shadow / text glow
  bg: string;          // Page background
  card: string;        // Card background
  text: string;        // Main text
  textMuted: string;   // Muted text
  border: string;      // Border color
  canvasFilter?: string; // Visualizer custom color hue-rotate
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  trackIds: string[];
}

export type ArtworkStyle = 'vinyl' | 'prism' | 'hud' | 'ambient' | 'cassette';

export type PlayerMode = 'spotify' | 'artwork';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  isRepeat: 'none' | 'all' | 'one';
  gaplessEnabled: boolean;
  crossfadeDuration: number; // 0 to 5 seconds
}
