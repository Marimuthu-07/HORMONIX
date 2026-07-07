/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useCallback } from 'react';
import { audioEngine, AudioEvent } from '../audio/AudioEngine';
import { usePlayerStore } from '../store/usePlayerStore';
import { useQueueStore } from '../store/useQueueStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { db } from '../database/db';

/**
 * useAudioEngine Hook
 * Connects the pure JS/HTML5 Audio Engine with our React state stores.
 * Orchestrates cross-track loading, repeat/shuffle transitions, volume fades, and global shortcuts.
 */
export function useAudioEngine() {
  const {
    setPlaying,
    setCurrentSong,
    setDuration,
    setProgress,
    setBuffered,
    setVolume,
    setMuted,
    setPlaybackRate,
    setBuffering
  } = usePlayerStore();

  const {
    queue,
    currentIndex,
    nextTrack,
    prevTrack,
    getCurrentSong,
    playSong
  } = useQueueStore();

  const { volume: savedVolume, isMuted: savedMute, updateSetting } = useSettingsStore();

  // Unified controller actions
  const play = useCallback(() => {
    audioEngine.play();
  }, []);

  const pause = useCallback(() => {
    audioEngine.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const isPlaying = usePlayerStore.getState().isPlaying;
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [play, pause]);

  const seek = useCallback((seconds: number) => {
    audioEngine.seek(seconds);
  }, []);

  const changeVolume = useCallback((val: number) => {
    audioEngine.setVolume(val);
    updateSetting('volume', val);
  }, [updateSetting]);

  const changeMuted = useCallback((val: boolean) => {
    audioEngine.setMute(val);
    updateSetting('isMuted', val);
  }, [updateSetting]);

  const handleNext = useCallback(async () => {
    const nextSong = nextTrack();
    if (nextSong) {
      setCurrentSong(nextSong);
      try {
        await audioEngine.loadSong(nextSong);
        audioEngine.play();
      } catch (err) {
        console.error('Failed to auto-advance to next track:', err);
      }
    } else {
      audioEngine.stop();
      setCurrentSong(null);
    }
  }, [nextTrack, setCurrentSong]);

  const handlePrev = useCallback(async () => {
    const prevSong = prevTrack();
    if (prevSong) {
      setCurrentSong(prevSong);
      try {
        await audioEngine.loadSong(prevSong);
        audioEngine.play();
      } catch (err) {
        console.error('Failed to skip back to previous track:', err);
      }
    }
  }, [prevTrack, setCurrentSong]);

  // Synchronize AudioEngine events to React Zustand Stores
  useEffect(() => {
    const unsubscribe = audioEngine.addEventListener((event: AudioEvent, data: any) => {
      switch (event) {
        case 'play':
          setPlaying(true);
          break;
        case 'pause':
          setPlaying(false);
          break;
        case 'stop':
          setPlaying(false);
          setProgress(0, 0);
          break;
        case 'timeupdate':
          setProgress(data.progress, data.currentTime);
          setBuffered(audioEngine.getBufferedProgress());
          break;
        case 'durationchange':
          setDuration(data);
          break;
        case 'buffering':
          setBuffering(data);
          break;
        case 'volumechange':
          setVolume(data.volume);
          setMuted(data.muted);
          break;
        case 'ratechange':
          setPlaybackRate(data);
          break;
        case 'song-transitioning':
          // Automatic crossfade began
          const oldSong = usePlayerStore.getState().currentSong;
          if (oldSong) {
            db.addHistoryEntry(oldSong.id).catch(console.error);
          }
          setCurrentSong(data);
          const nextIndex = useQueueStore.getState().queue.findIndex(s => s.id === data.id);
          if (nextIndex !== -1) {
            useQueueStore.setState({ currentIndex: nextIndex });
          }
          break;
        case 'ended':
          // Log playback history once track completes
          const current = getCurrentSong();
          if (current) {
            db.addHistoryEntry(current.id).catch(console.error);
          }
          handleNext();
          break;
        case 'error':
          console.error('Audio engine reported error, skipping...', data);
          setPlaying(false);
          handleNext(); // Skip broken files smoothly
          break;
      }
    });

    // Initialize initial values
    const settings = useSettingsStore.getState();
    audioEngine.setVolume(settings.volume);
    audioEngine.setMute(settings.isMuted);
    audioEngine.setEqEnabled(settings.eqEnabled || false);
    audioEngine.setEqBands(settings.eqGains || Array(10).fill(0));
    audioEngine.setBassBoost(settings.bassBoost || 0);
    audioEngine.setCompressorEnabled(settings.compressorEnabled || false);
    audioEngine.setCrossfadeDuration(settings.crossfadeDuration !== undefined ? settings.crossfadeDuration : 4);
    audioEngine.setReplayGainMode(settings.replayGainMode || 'off');

    // Register callback for looking ahead in the queue
    audioEngine.setNextSongCallback(() => {
      const q = useQueueStore.getState().queue;
      const idx = useQueueStore.getState().currentIndex;
      const rep = useQueueStore.getState().repeatMode;
      if (q.length === 0) return null;
      let nextIdx = idx + 1;
      if (nextIdx >= q.length) {
        if (rep === 'all') {
          nextIdx = 0;
        } else {
          return null;
        }
      }
      return q[nextIdx];
    });

    return () => {
      unsubscribe();
    };
  }, [
    setPlaying,
    setDuration,
    setProgress,
    setBuffered,
    setBuffering,
    setVolume,
    setMuted,
    setPlaybackRate,
    handleNext,
    getCurrentSong
  ]);

  // Synchronize settings changes directly to AudioEngine
  useEffect(() => {
    audioEngine.setVolume(savedVolume);
    audioEngine.setMute(savedMute);
  }, [savedVolume, savedMute]);

  // Setup Keyboard Media Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in forms or input fields
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          if (e.ctrlKey) {
            e.preventDefault();
            handleNext();
          } else {
            // Seek +5 seconds
            seek(audioEngine.getCurrentTime() + 5);
          }
          break;
        case 'ArrowLeft':
          if (e.ctrlKey) {
            e.preventDefault();
            handlePrev();
          } else {
            // Seek -5 seconds
            seek(audioEngine.getCurrentTime() - 5);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(1, audioEngine.getVolume() + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, audioEngine.getVolume() - 0.05));
          break;
        case 'KeyM':
          e.preventDefault();
          changeMuted(!audioEngine.isMuted());
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleNext, handlePrev, seek, changeVolume, changeMuted]);

  return {
    play,
    pause,
    togglePlay,
    seek,
    changeVolume,
    changeMuted,
    handleNext,
    handlePrev,
    playSong
  };
}
