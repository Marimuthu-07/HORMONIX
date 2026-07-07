/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Song } from '../../types';
import { db } from '../../database/db';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';
import { 
  Sparkles, 
  Clock, 
  Flame, 
  Inbox, 
  User, 
  Disc, 
  Play, 
  Plus, 
  ChevronRight, 
  ListMusic, 
  Music 
} from 'lucide-react';
import { useToastStore } from '../common/Toast';

interface SmartCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  bgGradient: string;
  iconColor: string;
  songs: Song[];
}

export const SmartLibrary: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [categories, setCategories] = useState<SmartCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SmartCategory | null>(null);

  const { playSong, setQueue, addToQueue } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = async () => {
    try {
      const allSongs = await db.getAllSongs();
      setSongs(allSongs);

      // 1. Recently Added (sorted by addedAt descending, top 25)
      const recentlyAdded = [...allSongs]
        .sort((a, b) => b.addedAt - a.addedAt)
        .slice(0, 25);

      // 2. Recently Played (sorted by lastPlayedAt, top 25)
      const recentlyPlayed = [...allSongs]
        .filter(s => s.lastPlayedAt)
        .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
        .slice(0, 25);

      // 3. Most Played (sorted by playCount descending, playCount > 0, top 25)
      const mostPlayed = [...allSongs]
        .filter(s => s.playCount > 0)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 25);

      // 4. Never Played (playCount === 0)
      const neverPlayed = allSongs.filter(s => s.playCount === 0);

      // Construct final categories
      const computed: SmartCategory[] = [
        {
          id: 'recently_added',
          name: 'Recently Added',
          description: 'The newest tracks imported into your collection',
          icon: <Plus className="h-5 w-5" />,
          bgGradient: 'from-blue-500/10 to-indigo-500/5 hover:border-blue-500/20',
          iconColor: 'text-blue-400',
          songs: recentlyAdded
        },
        {
          id: 'recently_played',
          name: 'Recently Played',
          description: 'Tracks you played over your last sessions',
          icon: <Clock className="h-5 w-5" />,
          bgGradient: 'from-emerald-500/10 to-teal-500/5 hover:border-emerald-500/20',
          iconColor: 'text-emerald-400',
          songs: recentlyPlayed
        },
        {
          id: 'most_played',
          name: 'Most Played',
          description: 'Your high rotation personal favorites',
          icon: <Flame className="h-5 w-5" />,
          bgGradient: 'from-purple-500/10 to-pink-500/5 hover:border-purple-500/20',
          iconColor: 'text-purple-400',
          songs: mostPlayed
        },
        {
          id: 'never_played',
          name: 'Never Played',
          description: 'Unheard songs waiting for their first spin',
          icon: <Inbox className="h-5 w-5" />,
          bgGradient: 'from-amber-500/10 to-orange-500/5 hover:border-amber-500/20',
          iconColor: 'text-amber-400',
          songs: neverPlayed
        }
      ];

      setCategories(computed);
    } catch (err) {
      console.error('Failed to compute smart stats:', err);
    }
  };

  const handlePlayCategory = (cat: SmartCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cat.songs.length === 0) return;
    setQueue(cat.songs);
    setCurrentSong(cat.songs[0]);
    audioEngine.loadSong(cat.songs[0]).then(() => play());
    showToast(`Playing dynamic list: ${cat.name}`, 'success');
  };

  const handleEnqueueCategory = (cat: SmartCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cat.songs.length === 0) return;
    cat.songs.forEach(s => addToQueue(s));
    showToast(`Enqueued ${cat.songs.length} tracks to queue`, 'success');
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 backdrop-blur-md h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100 tracking-wide text-sm">Smart Library</h3>
          <p className="text-xs text-zinc-400">Dynamically generated lists based on your personal listening behavior</p>
        </div>
      </div>

      {selectedCategory ? (
        // Sub-view: Display tracks of the selected smart category
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-zinc-400 hover:text-zinc-100 flex items-center gap-1.5 hover:underline"
            >
              ← Back to Smart Hub
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handlePlayCategory(selectedCategory, e)}
                className="flex items-center gap-1.5 px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-purple-500/20 transition-all"
              >
                <Play className="h-3 w-3 fill-current" />
                Play All
              </button>
              <button
                onClick={(e) => handleEnqueueCategory(selectedCategory, e)}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-all border border-white/5"
              >
                <Plus className="h-3 w-3" />
                Add Queue
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${selectedCategory.iconColor}`}>
              {selectedCategory.icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-zinc-200">{selectedCategory.name}</h4>
              <p className="text-[11px] text-zinc-500 font-medium">{selectedCategory.songs.length} tracks computed dynamically</p>
            </div>
          </div>

          {/* Tracks list */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            {selectedCategory.songs.length > 0 ? (
              selectedCategory.songs.map((song, index) => (
                <div
                  key={song.id}
                  className="group flex items-center justify-between rounded-xl p-2 px-3 text-xs hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => {
                    playSong(song);
                    setCurrentSong(song);
                    audioEngine.loadSong(song).then(() => play());
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-4 text-zinc-500 font-semibold font-mono text-center">{index + 1}</span>
                    <div className="overflow-hidden">
                      <span className="block font-semibold text-zinc-200 truncate">{song.title}</span>
                      <span className="block text-[10px] text-zinc-400 truncate">{song.artist} • {song.album}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
                    {selectedCategory.id === 'most_played' && (
                      <span className="text-purple-400 font-semibold">{song.playCount} plays</span>
                    )}
                    <span>{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
                <Music className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-xs">No songs in this collection yet.</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Main view: Grid of bento-style smart collections
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-2xl border border-white/5 bg-gradient-to-br ${cat.bgGradient} p-5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 flex flex-col justify-between group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950/40 ${cat.iconColor} group-hover:scale-105 transition-transform duration-200`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-200 text-sm group-hover:text-white transition-colors">{cat.name}</h4>
                    <p className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">{cat.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors self-center" />
              </div>

              <div className="flex items-end justify-between border-t border-white/5 pt-4 mt-6">
                <div className="text-[11px] font-mono font-semibold text-zinc-500">
                  <span className={`text-zinc-300 font-bold ${cat.iconColor}`}>{cat.songs.length}</span> TRACKS
                </div>

                {cat.songs.length > 0 && (
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => handlePlayCategory(cat, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500 text-white shadow-md shadow-purple-500/20 transition-all hover:scale-105"
                      title="Play list"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                    <button
                      onClick={(e) => handleEnqueueCategory(cat, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900/60 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors border border-white/5"
                      title="Add to queue"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
