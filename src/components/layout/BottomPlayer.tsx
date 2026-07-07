/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Heart,
  ListMusic,
  Music
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useQueueStore } from '../../store/useQueueStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { CoverArt } from '../common/CoverArt';
import { SongRepository } from '../../electron/repositories/SongRepository';
import { useToastStore } from '../common/Toast';
import { useAppStore } from '../../store/useAppStore';

export const BottomPlayer: React.FC = () => {
  const { 
    currentSong, 
    isPlaying, 
    progress, 
    currentTime, 
    duration, 
    volume, 
    isMuted, 
    setFullscreen 
  } = usePlayerStore();

  const { shuffle, repeatMode, setShuffle, setRepeatMode, setQueue, queue } = useQueueStore();
  const { togglePlay, seek, changeVolume, changeMuted, handleNext, handlePrev } = useAudioEngine();
  const { showToast } = useToastStore();
  const { activeView, setView } = useAppStore();

  const [hoverProgress, setHoverProgress] = useState<number | null>(null);

  // Formatting utility (e.g. 182 -> 3:02)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    seek(pct * duration);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSong) return;
    const nextFav = !currentSong.favorite;
    const updated = await SongRepository.toggleFavorite(currentSong.id, nextFav);
    if (updated) {
      usePlayerStore.getState().setCurrentSong(updated);
      showToast(nextFav ? 'Added to favorites' : 'Removed from favorites', 'success');
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeVolume(parseFloat(e.target.value));
  };

  return (
    <div 
      onClick={() => setFullscreen(true)}
      className="relative flex h-20 w-full items-center justify-between border-t border-white/5 bg-zinc-950/90 md:px-6 px-2 backdrop-blur-xl cursor-pointer hover:bg-zinc-900/40 transition-colors duration-150 select-none"
    >
      {/* Sleek top progress indicator line on mobile player */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-zinc-800 md:hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Desktop player layout */}
      <div className="hidden md:flex w-full items-center justify-between">
        {/* Current Song Widget */}
        <div className="flex w-1/4 items-center gap-3">
          {currentSong ? (
            <>
              <CoverArt songId={currentSong.id} hasCover={currentSong.hasCover} className="h-12 w-12 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold text-zinc-100">{currentSong.title}</h4>
                <p className="truncate text-xs text-zinc-400">{currentSong.artist}</p>
              </div>
              <button 
                onClick={toggleFavorite}
                className={`flex-shrink-0 rounded-lg p-2 transition-all duration-150 active:scale-95 ${
                  currentSong.favorite ? 'text-pink-500' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                }`}
              >
                <Heart className="h-4 w-4 fill-current" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="h-12 w-12 rounded-lg bg-zinc-900 border border-white/5" />
              <div className="text-xs">No song loaded</div>
            </div>
          )}
        </div>

        {/* Playback Controls & Timeline (Center) */}
        <div className="flex w-2/5 flex-col items-center gap-2">
          {/* Core Buttons */}
          <div className="flex items-center gap-6">
            <button
              onClick={(e) => { e.stopPropagation(); setShuffle(!shuffle); }}
              className={`rounded-lg p-1.5 transition-all duration-150 active:scale-90 ${
                shuffle ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all duration-150"
              title="Previous track"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-600/20 active:scale-90 hover:bg-purple-500 transition-all duration-150"
              title={isPlaying ? "Pause" : "Play"}
              id="control-play-pause"
            >
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-100 active:scale-90 transition-all duration-150"
              title="Next track"
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
                const currentIdx = modes.indexOf(repeatMode);
                const nextMode = modes[(currentIdx + 1) % modes.length];
                setRepeatMode(nextMode);
                showToast(`Repeat: ${nextMode.toUpperCase()}`, 'info');
              }}
              className={`relative rounded-lg p-1.5 transition-all duration-150 active:scale-90 ${
                repeatMode !== 'none' ? 'text-purple-400' : 'text-zinc-400 hover:text-zinc-100'
              }`}
              title="Repeat mode"
            >
              <Repeat className="h-4 w-4" />
              {repeatMode === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Timeline Slider */}
          <div className="flex w-full items-center gap-3">
            <span className="w-10 text-right text-[10px] font-medium text-zinc-500 font-mono">
              {formatTime(currentTime)}
            </span>
            <div 
              onClick={handleTimelineClick}
              className="group relative h-1.5 w-full cursor-pointer rounded-full bg-zinc-800"
            >
              {/* Real Progress indicator bar */}
              <div 
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:from-purple-400 group-hover:to-pink-400"
                style={{ width: `${progress}%` }}
              />
              {/* Grabber circle */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 scale-0 rounded-full bg-white shadow-md transition-transform duration-100 group-hover:scale-100"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>
            <span className="w-10 text-left text-[10px] font-medium text-zinc-500 font-mono">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Utility Actions (Right) */}
        <div className="flex w-1/4 items-center justify-end gap-4">
          {/* Toggle Active Queue View */}
          <button
            onClick={(e) => { e.stopPropagation(); setView(activeView === 'queue' ? 'library' : 'queue'); }}
            className={`rounded-lg p-2 transition-all duration-150 active:scale-95 ${
              activeView === 'queue' ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
            }`}
            title="Play queue"
          >
            <ListMusic className="h-5 w-5" />
          </button>

          {/* Volume controls */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => { e.stopPropagation(); changeMuted(!isMuted); }}
              className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 active:scale-95 transition-all duration-150"
              title="Mute / Unmute"
            >
              {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              onClick={(e) => e.stopPropagation()}
              className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Maximize to full-screen mode */}
          <button
            onClick={(e) => { e.stopPropagation(); setFullscreen(true); }}
            className="rounded-lg p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 active:scale-95 transition-all duration-150"
            title="Fullscreen player"
          >
            <Maximize2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Mobile-only compact player layout */}
      <div className="flex md:hidden w-full items-center justify-between px-3 h-full">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {currentSong ? (
            <>
              <CoverArt songId={currentSong.id} hasCover={currentSong.hasCover} className="h-11 w-11 rounded-lg flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-xs font-bold text-zinc-100">{currentSong.title}</h4>
                <p className="truncate text-[10px] text-zinc-400 mt-0.5">{currentSong.artist}</p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-zinc-500">
              <div className="h-11 w-11 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center">
                <Music className="h-4 w-4 opacity-40 text-purple-400" />
              </div>
              <div className="text-xs">No track playing</div>
            </div>
          )}
        </div>

        {/* Compact buttons */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            className="p-2 text-zinc-400 active:scale-90"
            disabled={!currentSong}
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg active:scale-90 hover:bg-purple-500 transition-all duration-150"
            disabled={!currentSong}
          >
            {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            className="p-2 text-zinc-400 active:scale-90"
            disabled={!currentSong}
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
