/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Song } from '../types';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  duration: number;
  progress: number;
  currentTime: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isBuffering: boolean;
  isFullscreen: boolean;

  setPlaying: (isPlaying: boolean) => void;
  setCurrentSong: (song: Song | null) => void;
  setDuration: (duration: number) => void;
  setProgress: (progress: number, currentTime: number) => void;
  setBuffered: (buffered: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (isMuted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setBuffering: (isBuffering: boolean) => void;
  setFullscreen: (isFullscreen: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  isPlaying: false,
  duration: 0,
  progress: 0,
  currentTime: 0,
  buffered: 0,
  volume: 1.0,
  isMuted: false,
  playbackRate: 1.0,
  isBuffering: false,
  isFullscreen: false,

  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentSong: (currentSong) => set({ currentSong }),
  setDuration: (duration) => set({ duration }),
  setProgress: (progress, currentTime) => set({ progress, currentTime }),
  setBuffered: (buffered) => set({ buffered }),
  setVolume: (volume) => set({ volume }),
  setMuted: (isMuted) => set({ isMuted }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setBuffering: (isBuffering) => set({ isBuffering }),
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
}));
