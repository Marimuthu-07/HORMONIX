/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Timer, 
  Sliders,
  Sparkles,
  Music,
  ListMusic
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useQueueStore } from '../../store/useQueueStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';
import { CoverArt } from '../common/CoverArt';
import { useToastStore } from '../common/Toast';
import { LyricsPanel } from './LyricsPanel';

export const FullscreenPlayer: React.FC = () => {
  const { 
    currentSong, 
    isPlaying, 
    progress, 
    currentTime, 
    duration, 
    volume, 
    isMuted, 
    playbackRate,
    isFullscreen, 
    setFullscreen,
    setPlaybackRate 
  } = usePlayerStore();

  const { shuffle, repeatMode, setShuffle, setRepeatMode, queue } = useQueueStore();
  const { togglePlay, seek, changeVolume, changeMuted, handleNext, handlePrev } = useAudioEngine();
  const { showToast } = useToastStore();

  const [sleepTimerActive, setSleepTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  // Keyboard shortcut for escaping fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, setFullscreen]);

  // Sleep Timer logic
  useEffect(() => {
    if (!sleepTimerActive || timeLeft === null) return;
    if (timeLeft <= 0) {
      useAudioEngine().pause();
      setSleepTimerActive(false);
      setTimeLeft(null);
      showToast('Sleep timer expired. Playback paused.', 'info');
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sleepTimerActive, timeLeft, showToast]);

  const triggerSleepTimer = (minutes: number) => {
    setSleepTimerActive(true);
    setTimeLeft(minutes * 60);
    showToast(`Sleep timer set for ${minutes} minutes.`, 'success');
  };

  const cancelSleepTimer = () => {
    setSleepTimerActive(false);
    setTimeLeft(null);
    showToast('Sleep timer cancelled.', 'info');
  };

  const changeSpeed = (rate: number) => {
    audioEngine.setPlaybackRate(rate);
    setPlaybackRate(rate);
    showToast(`Speed: ${rate}x`, 'info');
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isFullscreen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col justify-between bg-zinc-950 p-8 select-none overflow-hidden"
        id="fullscreen-player"
      >
        {/* Immersive blurred backdrop art */}
        <div className="absolute inset-0 z-0 opacity-20 filter blur-[120px] scale-125 select-none pointer-events-none transition-all duration-1000">
          <CoverArt songId={currentSong?.id} hasCover={currentSong?.hasCover} className="h-full w-full object-cover" />
        </div>

        {/* Top bar operations */}
        <div className="relative z-10 flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">
              Now Playing Immersive
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLyrics(!showLyrics);
                if (!showLyrics) setShowQueue(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                showLyrics 
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' 
                  : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Music className="h-4 w-4" />
              <span>{showLyrics ? 'Hide Synced Lyrics' : 'Show Synced Lyrics'}</span>
            </button>

            <button
              onClick={() => {
                setShowQueue(!showQueue);
                if (!showQueue) setShowLyrics(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                showQueue 
                  ? 'bg-purple-500/15 border-purple-500/30 text-purple-400' 
                  : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ListMusic className="h-4 w-4" />
              <span>{showQueue ? 'Hide Playlist' : 'Show Playlist'}</span>
            </button>

            <button
              onClick={() => setFullscreen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-zinc-900/50 hover:bg-white/10 text-zinc-400 hover:text-white transition-all duration-150"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center Presentation Disc & Visualizer Area */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-16 flex-1 max-w-5xl mx-auto w-full overflow-hidden my-4">
          {(!showLyrics && !showQueue) ? (
            /* STANDARD ARTWORK VIEW */
            <>
              {/* Rotating CD Art Disc */}
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{ rotate: isPlaying ? 360 : 0 }}
                  transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
                  className="relative h-64 w-64 md:h-80 md:w-80 rounded-full border-4 border-zinc-900 shadow-2xl overflow-hidden shadow-purple-500/10 flex-shrink-0"
                >
                  <CoverArt songId={currentSong?.id} hasCover={currentSong?.hasCover} className="h-full w-full object-cover" />
                  {/* Central spindle hole to look like real CD */}
                  <div className="absolute inset-0 m-auto h-12 w-12 rounded-full border-2 border-zinc-900 bg-zinc-950/80 shadow-inner flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-zinc-900" />
                  </div>
                </motion.div>
              </div>

              {/* Song Info & Sliders */}
              <div className="flex-1 flex flex-col gap-6 w-full max-w-md">
                <div>
                  <h1 className="text-3xl font-extrabold text-zinc-100 tracking-tight leading-snug truncate">
                    {currentSong?.title || 'No Song Loaded'}
                  </h1>
                  <p className="text-lg text-purple-400 mt-1 font-medium truncate">
                    {currentSong?.artist || 'Unknown Artist'}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5 truncate font-mono">
                    {currentSong?.album || 'Unknown Album'}
                  </p>
                </div>

                {/* Timeline Progress */}
                <div className="flex flex-col gap-2">
                  <div 
                    onClick={(e) => {
                      if (!duration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seek(pct * duration);
                    }}
                    className="group relative h-2 w-full cursor-pointer rounded-full bg-zinc-800"
                  >
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:from-purple-400 group-hover:to-pink-400"
                      style={{ width: `${progress}%` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 scale-0 rounded-full bg-white shadow-md transition-transform duration-100 group-hover:scale-100"
                      style={{ left: `calc(${progress}% - 7px)` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Core Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={() => setShuffle(!shuffle)}
                    className={`rounded-lg p-2 transition-all duration-150 active:scale-90 ${
                      shuffle ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Shuffle className="h-5 w-5" />
                  </button>

                  <button
                    onClick={handlePrev}
                    className="rounded-lg p-2 text-zinc-400 hover:text-white active:scale-90 transition-all duration-150"
                  >
                    <SkipBack className="h-7 w-7 fill-current" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl shadow-purple-600/30 active:scale-90 hover:bg-purple-500 transition-all duration-150"
                  >
                    {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current ml-1" />}
                  </button>

                  <button
                    onClick={handleNext}
                    className="rounded-lg p-2 text-zinc-400 hover:text-white active:scale-90 transition-all duration-150"
                  >
                    <SkipForward className="h-7 w-7 fill-current" />
                  </button>

                  <button
                    onClick={() => {
                      const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
                      setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]);
                    }}
                    className={`relative rounded-lg p-2 transition-all duration-150 active:scale-90 ${
                      repeatMode !== 'none' ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Repeat className="h-5 w-5" />
                    {repeatMode === 'one' && (
                      <span className="absolute top-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">1</span>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* IMMERSIVE SPLIT-PANE VIEW (LYRICS OR QUEUE) */
            <div className="flex flex-col md:flex-row items-stretch justify-between w-full h-full gap-8 lg:gap-12 overflow-hidden">
              {/* Left Column: Mini Artwork + Controls Block */}
              <div className="w-full md:w-80 flex flex-col justify-center gap-5 flex-shrink-0">
                <div className="flex items-center gap-4">
                  {/* Rotating CD Art Disc (mini format) */}
                  <motion.div
                    animate={{ rotate: isPlaying ? 360 : 0 }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
                    className="relative h-20 w-20 rounded-full border-2 border-zinc-850 shadow-lg overflow-hidden flex-shrink-0"
                  >
                    <CoverArt songId={currentSong?.id} hasCover={currentSong?.hasCover} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 m-auto h-4 w-4 rounded-full border border-zinc-900 bg-zinc-950/80" />
                  </motion.div>
                  <div className="overflow-hidden">
                    <h2 className="text-xl font-bold text-zinc-100 truncate tracking-tight">{currentSong?.title}</h2>
                    <p className="text-sm text-purple-400 font-medium truncate mt-0.5">{currentSong?.artist}</p>
                    <p className="text-xs text-zinc-500 truncate font-mono mt-0.5">{currentSong?.album}</p>
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="flex flex-col gap-2">
                  <div 
                    onClick={(e) => {
                      if (!duration) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      seek(pct * duration);
                    }}
                    className="group relative h-1.5 w-full cursor-pointer rounded-full bg-zinc-800"
                  >
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:from-purple-400 group-hover:to-pink-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Core Controls */}
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => setShuffle(!shuffle)}
                    className={`rounded-lg p-1.5 transition-all duration-150 active:scale-90 ${
                      shuffle ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Shuffle className="h-4.5 w-4.5" />
                  </button>

                  <button
                    onClick={handlePrev}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-white active:scale-90 transition-all duration-150"
                  >
                    <SkipBack className="h-5.5 w-5.5 fill-current" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-600/20 active:scale-90 hover:bg-purple-500 transition-all duration-150"
                  >
                    {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={handleNext}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-white active:scale-90 transition-all duration-150"
                  >
                    <SkipForward className="h-5.5 w-5.5 fill-current" />
                  </button>

                  <button
                    onClick={() => {
                      const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
                      setRepeatMode(modes[(modes.indexOf(repeatMode) + 1) % modes.length]);
                    }}
                    className={`relative rounded-lg p-1.5 transition-all duration-150 active:scale-90 ${
                      repeatMode !== 'none' ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    <Repeat className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Synced Scrolling LRC Lyrics panel OR Playlist/Queue panel */}
              <div className="flex-1 w-full min-h-[300px] h-full overflow-hidden">
                {showLyrics ? (
                  <LyricsPanel />
                ) : (
                  /* PLAYLIST (QUEUE) VIEW */
                  <div className="flex h-full flex-col bg-zinc-900/40 border border-white/5 rounded-2xl p-5 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                          <span>Upcoming Tracks</span>
                          <span className="text-xs text-purple-400 font-mono">({queue.length} items)</span>
                        </h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Click a song to play instantly</p>
                      </div>
                      
                      {queue.length > 0 && (
                        <button
                          onClick={() => {
                            useQueueStore.getState().clearQueue();
                            showToast('Queue cleared', 'info');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-red-600/10 border border-red-500/10 text-[10px] font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all duration-150"
                        >
                          Clear Queue
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                      {queue.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-zinc-500 gap-2 p-8 text-center">
                          <Music className="h-8 w-8 opacity-25" />
                          <p className="text-xs font-semibold">Play queue is currently empty</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {queue.map((song, idx) => {
                            const isSongPlaying = idx === useQueueStore.getState().currentIndex;
                            return (
                              <div
                                key={`${song.id}-${idx}`}
                                className={`group flex items-center justify-between p-2 rounded-xl border transition-all duration-150 ${
                                  isSongPlaying
                                    ? 'bg-purple-600/15 border-purple-500/25 text-purple-400'
                                    : 'bg-zinc-950/20 border-white/[0.02] hover:bg-zinc-950/60 hover:border-white/5'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="w-5 text-center text-[10px] font-mono font-bold text-zinc-500">
                                    {idx + 1}
                                  </span>
                                  <CoverArt songId={song.id} hasCover={song.hasCover} className="h-8 w-8 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <h4 className={`truncate text-xs font-bold ${isSongPlaying ? 'text-purple-400' : 'text-zinc-100'}`}>
                                      {song.title}
                                    </h4>
                                    <p className="truncate text-[10px] text-zinc-400 mt-0.5">{song.artist}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-zinc-500 px-1">
                                    {formatTime(song.duration)}
                                  </span>
                                  
                                  <button
                                    onClick={async () => {
                                      useQueueStore.setState({ currentIndex: idx });
                                      usePlayerStore.getState().setCurrentSong(song);
                                      try {
                                        await audioEngine.loadSong(song);
                                        togglePlay();
                                      } catch {}
                                    }}
                                    className="p-1 rounded-md text-purple-400 hover:bg-purple-600/10 active:scale-90 transition-all"
                                  >
                                    <Play className="h-3 w-3 fill-current" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      useQueueStore.getState().removeFromQueue(idx);
                                      showToast('Removed from queue', 'info');
                                    }}
                                    className="p-1 rounded-md text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Utility Controls (Timer, Playback rates, Volume) */}
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between border-t border-white/5 bg-zinc-950/60 p-4 rounded-2xl backdrop-blur-md gap-4">
          {/* Audio Speed Rate Controls */}
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <Sliders className="h-4 w-4 text-purple-400" />
            <span className="mr-2">Speed:</span>
            {[1.0, 1.25, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`px-2.5 py-1 rounded-lg border border-white/5 transition-all duration-150 ${
                  playbackRate === rate ? 'bg-purple-600 text-white' : 'hover:bg-white/5'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Sleep Timer Settings */}
          <div className="flex items-center gap-3 text-xs font-semibold text-zinc-400">
            <Timer className="h-4 w-4 text-purple-400" />
            <span>Sleep Timer:</span>
            {sleepTimerActive && timeLeft !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-purple-400 font-mono font-bold">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
                <button 
                  onClick={cancelSleepTimer} 
                  className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => triggerSleepTimer(mins)}
                    className="px-2 py-0.5 rounded hover:bg-white/5 border border-white/5"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Large Volume Slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMuted(!isMuted)}
              className="rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all duration-150"
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              className="h-1.5 w-32 cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-purple-600 focus:outline-none"
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
