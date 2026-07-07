/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Trash2, ListMinus, ArrowDown, ArrowUp } from 'lucide-react';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';
import { CoverArt } from '../common/CoverArt';
import { useToastStore } from '../common/Toast';

export const QueuePanel: React.FC = () => {
  const { queue, currentIndex, removeFromQueue, reorderQueue, clearQueue, playSong } = useQueueStore();
  const { currentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();

  const handlePlayIndex = async (index: number) => {
    const targetSong = queue[index];
    if (!targetSong) return;
    
    // Set active playing song index
    useQueueStore.setState({ currentIndex: index });
    usePlayerStore.getState().setCurrentSong(targetSong);
    try {
      await audioEngine.loadSong(targetSong);
      play();
    } catch {}
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    reorderQueue(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === queue.length - 1) return;
    reorderQueue(index, index + 1);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-hidden select-none">
      {/* Header operations */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Active session</h2>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            <span>Play Queue List</span>
            <span className="text-xs text-purple-400 font-mono">({queue.length} songs)</span>
          </h1>
        </div>
        
        {queue.length > 0 && (
          <button
            onClick={() => {
              clearQueue();
              showToast('Queue cleared', 'info');
            }}
            className="flex h-10 items-center gap-2 rounded-xl bg-red-600/10 border border-red-500/10 px-4 text-xs font-semibold text-red-400 hover:bg-red-600 hover:text-white transition-all duration-150"
          >
            <ListMinus className="h-4 w-4" />
            <span>Clear Queue</span>
          </button>
        )}
      </div>

      {/* Main list scroller container */}
      <div className="flex-1 overflow-y-auto pr-2 pb-12" id="queue-scroller">
        {queue.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
            <Trash2 className="h-10 w-10 opacity-30 animate-bounce" />
            <p className="text-sm font-medium">No songs queued up. Double-click any song to populate!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {queue.map((song, idx) => {
              const isPlaying = idx === currentIndex;
              return (
                <div
                  key={`${song.id}-${idx}`}
                  className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 ${
                    isPlaying
                      ? 'bg-purple-600/10 border-purple-500/20 text-purple-400'
                      : 'bg-zinc-900/10 border-white/5 hover:bg-zinc-900/40 hover:border-white/10'
                  }`}
                >
                  {/* Left segment */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-mono font-bold text-zinc-500">
                      {idx + 1}
                    </span>
                    <CoverArt songId={song.id} hasCover={song.hasCover} className="h-10 w-10 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h4 className={`truncate text-sm font-bold ${isPlaying ? 'text-purple-400' : 'text-zinc-100'}`}>
                        {song.title}
                      </h4>
                      <p className="truncate text-xs text-zinc-400 mt-0.5">{song.artist}</p>
                    </div>
                  </div>

                  {/* Actions segment (Right) */}
                  <div className="flex items-center gap-2">
                    {/* Position swap buttons */}
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 disabled:opacity-25 transition-all"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === queue.length - 1}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/5 disabled:opacity-25 transition-all"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <span className="text-xs font-semibold text-zinc-500 font-mono px-2">
                      {formatDuration(song.duration)}
                    </span>

                    <button
                      onClick={() => handlePlayIndex(idx)}
                      className="p-2 rounded-lg text-purple-400 hover:bg-purple-600/10 active:scale-90 transition-all"
                      title="Play song"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>

                    <button
                      onClick={() => {
                        removeFromQueue(idx);
                        showToast('Removed from queue', 'info');
                      }}
                      className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                      title="Remove song"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
