/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Song } from '../types';

interface QueueState {
  queue: Song[];
  originalQueue: Song[]; // Cache to restore original order when un-shuffling
  currentIndex: number;
  shuffle: boolean;
  repeatMode: 'none' | 'one' | 'all';
  history: Song[];

  setQueue: (songs: Song[]) => void;
  playSong: (song: Song) => void;
  playNext: (song: Song) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  setShuffle: (shuffle: boolean) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  nextTrack: () => Song | null;
  prevTrack: () => Song | null;
  clearQueue: () => void;
  getCurrentSong: () => Song | null;
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const useQueueStore = create<QueueState>((set, get) => ({
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  shuffle: false,
  repeatMode: 'all',
  history: [],

  setQueue: (songs) => {
    const { shuffle } = get();
    if (shuffle) {
      const shuffled = shuffleArray(songs);
      set({
        queue: shuffled,
        originalQueue: songs,
        currentIndex: songs.length > 0 ? 0 : -1
      });
    } else {
      set({
        queue: songs,
        originalQueue: songs,
        currentIndex: songs.length > 0 ? 0 : -1
      });
    }
  },

  getCurrentSong: () => {
    const { queue, currentIndex } = get();
    if (currentIndex >= 0 && currentIndex < queue.length) {
      return queue[currentIndex];
    }
    return null;
  },

  playSong: (song) => {
    const { queue } = get();
    const existingIndex = queue.findIndex(s => s.id === song.id);

    if (existingIndex !== -1) {
      set({ currentIndex: existingIndex });
    } else {
      // If not in the queue, add it at the current index + 1 and play it
      const newQueue = [...queue];
      const newIndex = get().currentIndex + 1;
      newQueue.splice(newIndex, 0, song);
      set({
        queue: newQueue,
        currentIndex: newIndex,
        originalQueue: [...get().originalQueue, song]
      });
    }
  },

  playNext: (song) => {
    const { queue, currentIndex } = get();
    const newQueue = [...queue];
    
    // Remove if already exists downstream
    const existingIndex = newQueue.findIndex(s => s.id === song.id);
    if (existingIndex !== -1 && existingIndex !== currentIndex) {
      newQueue.splice(existingIndex, 1);
    }

    const insertIndex = queue.length === 0 ? 0 : currentIndex + 1;
    newQueue.splice(insertIndex, 0, song);
    
    set({
      queue: newQueue,
      originalQueue: [...get().originalQueue, song]
    });
  },

  addToQueue: (song) => {
    const { queue } = get();
    set({
      queue: [...queue, song],
      originalQueue: [...get().originalQueue, song]
    });
  },

  removeFromQueue: (index) => {
    const { queue, currentIndex } = get();
    if (index < 0 || index >= queue.length) return;

    const newQueue = [...queue];
    newQueue.splice(index, 1);

    let newIndex = currentIndex;
    if (index === currentIndex) {
      newIndex = Math.min(currentIndex, newQueue.length - 1);
    } else if (index < currentIndex) {
      newIndex = currentIndex - 1;
    }

    set({
      queue: newQueue,
      currentIndex: newIndex
    });
  },

  reorderQueue: (startIndex, endIndex) => {
    const { queue, currentIndex } = get();
    const newQueue = [...queue];
    const [removed] = newQueue.splice(startIndex, 1);
    newQueue.splice(endIndex, 0, removed);

    let newIndex = currentIndex;
    if (currentIndex === startIndex) {
      newIndex = endIndex;
    } else if (currentIndex > startIndex && currentIndex <= endIndex) {
      newIndex--;
    } else if (currentIndex < startIndex && currentIndex >= endIndex) {
      newIndex++;
    }

    set({
      queue: newQueue,
      currentIndex: newIndex
    });
  },

  setShuffle: (shuffle) => {
    const { queue, originalQueue, currentIndex } = get();
    if (shuffle === get().shuffle) return;

    if (shuffle) {
      // Enable shuffle: randomize queue but keep current playing song at the beginning
      const currentSong = queue[currentIndex];
      const rest = queue.filter((_, idx) => idx !== currentIndex);
      const shuffledRest = shuffleArray(rest);
      const newQueue = currentSong ? [currentSong, ...shuffledRest] : shuffledRest;
      
      set({
        shuffle: true,
        originalQueue: queue, // preserve old state
        queue: newQueue,
        currentIndex: currentSong ? 0 : -1
      });
    } else {
      // Disable shuffle: restore original order, find current playing song index
      const currentSong = queue[currentIndex];
      const newIndex = originalQueue.findIndex(s => s.id === (currentSong?.id || ''));
      
      set({
        shuffle: false,
        queue: originalQueue,
        currentIndex: newIndex !== -1 ? newIndex : 0
      });
    }
  },

  setRepeatMode: (repeatMode) => {
    set({ repeatMode });
  },

  nextTrack: () => {
    const { queue, currentIndex, repeatMode, history } = get();
    if (queue.length === 0) return null;

    const currentSong = queue[currentIndex];
    const nextHistory = currentSong ? [...history, currentSong].slice(-50) : history;

    if (repeatMode === 'one' && currentSong) {
      return currentSong;
    }

    let nextIndex = currentIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return null; // Stop playback
      }
    }

    set({ currentIndex: nextIndex, history: nextHistory });
    return queue[nextIndex];
  },

  prevTrack: () => {
    const { queue, currentIndex, repeatMode } = get();
    if (queue.length === 0) return null;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0; // remain on first track
      }
    }

    set({ currentIndex: prevIndex });
    return queue[prevIndex];
  },

  clearQueue: () => {
    set({
      queue: [],
      originalQueue: [],
      currentIndex: -1
    });
  }
}));
