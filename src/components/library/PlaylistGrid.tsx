/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, ListMusic, Plus, Trash, ArrowLeft, Heart, Sparkles, Pencil } from 'lucide-react';
import { Playlist, Song } from '../../types';
import { db } from '../../database/db';
import { useAppStore } from '../../store/useAppStore';
import { SongList } from './SongList';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';
import { useToastStore } from '../common/Toast';

export const PlaylistGrid: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // Track selected playlist song lists
  const [playlistSongs, setPlaylistSongs] = useState<Song[]>([]);

  const { selectedPlaylist, selectPlaylist } = useAppStore();
  const { setQueue, playSong } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();

  const loadPlaylists = async () => {
    try {
      const data = await db.getAllPlaylists();
      setPlaylists(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPlaylistSongs = async (playlist: Playlist) => {
    try {
      if (playlist.isSmart) {
        const allSongs = await db.getAllSongs();
        if (playlist.id === 'smart_favorites') {
          setPlaylistSongs(allSongs.filter(s => s.favorite));
        } else if (playlist.id === 'smart_most_played') {
          setPlaylistSongs([...allSongs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 50));
        } else if (playlist.id === 'smart_recently_added') {
          setPlaylistSongs([...allSongs].sort((a, b) => b.addedAt - a.addedAt).slice(0, 50));
        }
      } else {
        // Custom user playlist
        const songIds = await db.getPlaylistSongs(playlist.id);
        const allSongs = await db.getAllSongs();
        const songsMap = new Map<string, Song>();
        allSongs.forEach(s => songsMap.set(s.id, s));
        
        const matchedSongs = songIds
          .map(id => songsMap.get(id))
          .filter((s): s is Song => !!s);
        
        setPlaylistSongs(matchedSongs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistSongs(selectedPlaylist);
    }
  }, [selectedPlaylist]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const playlist: Playlist = {
      id: `custom_${Math.random().toString(36).substring(2, 9)}`,
      name: newPlaylistName.trim(),
      createdAt: Date.now(),
      isSmart: false
    };

    try {
      await db.savePlaylist(playlist);
      showToast('Playlist created', 'success');
      setNewPlaylistName('');
      setIsCreating(false);
      loadPlaylists();
    } catch {
      showToast('Failed to create playlist', 'error');
    }
  };

  const handleDeletePlaylist = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this playlist? This action cannot be undone.')) {
      try {
        await db.deletePlaylist(id);
        showToast('Playlist deleted', 'success');
        selectPlaylist(null);
        loadPlaylists();
      } catch {
        showToast('Failed to delete playlist', 'error');
      }
    }
  };

  const handlePlayPlaylist = async (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    // Fetch and play all tracks in the playlist
    const allSongs = await db.getAllSongs();
    let targetSongs: Song[] = [];

    if (playlist.isSmart) {
      if (playlist.id === 'smart_favorites') {
        targetSongs = allSongs.filter(s => s.favorite);
      } else if (playlist.id === 'smart_most_played') {
        targetSongs = [...allSongs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 50);
      } else if (playlist.id === 'smart_recently_added') {
        targetSongs = [...allSongs].sort((a, b) => b.addedAt - a.addedAt).slice(0, 50);
      }
    } else {
      const songIds = await db.getPlaylistSongs(playlist.id);
      const songsMap = new Map<string, Song>();
      allSongs.forEach(s => songsMap.set(s.id, s));
      targetSongs = songIds.map(id => songsMap.get(id)).filter((s): s is Song => !!s);
    }

    if (targetSongs.length === 0) {
      showToast('Playlist is empty', 'info');
      return;
    }

    setQueue(targetSongs);
    const firstSong = targetSongs[0];
    playSong(firstSong);
    setCurrentSong(firstSong);
    try {
      await audioEngine.loadSong(firstSong);
      play();
    } catch {}
  };

  // Compile smart presets
  const smartPlaylists: Playlist[] = [
    { id: 'smart_favorites', name: 'My Favorites', createdAt: 0, isSmart: true },
    { id: 'smart_most_played', name: 'Most Played Mix', createdAt: 0, isSmart: true },
    { id: 'smart_recently_added', name: 'Recently Imported', createdAt: 0, isSmart: true },
  ];

  // Playlist Details sub-page view
  if (selectedPlaylist) {
    return (
      <div className="flex h-full flex-col md:p-6 p-3 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => selectPlaylist(null)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/60 border border-white/5 hover:bg-white/5 text-zinc-300 hover:text-white transition-all duration-150"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              {selectedPlaylist.isSmart ? 'Smart Playlist' : 'Custom Playlist'}
            </h2>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">{selectedPlaylist.name}</h1>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-8 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 backdrop-blur-md items-center sm:items-start text-center sm:text-left">
          <div className="h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 rounded-2xl bg-gradient-to-tr from-purple-600/20 to-pink-600/20 flex flex-shrink-0 items-center justify-center text-purple-400 shadow-md border border-purple-500/10">
            {selectedPlaylist.id === 'smart_favorites' ? <Heart className="h-10 w-10 sm:h-12 sm:w-12 fill-current" /> : <ListMusic className="h-10 w-10 sm:h-12 sm:w-12" />}
          </div>
          <div className="flex flex-col justify-between py-1">
            <div>
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/10 px-2.5 py-1 rounded-full font-mono font-bold">
                {selectedPlaylist.isSmart ? 'SMART ALGORITHM' : 'PLAYLIST'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight mt-3">{selectedPlaylist.name}</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4">
              <button 
                onClick={(e) => handlePlayPlaylist(e, selectedPlaylist)}
                className="flex h-10 px-5 items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/20 active:scale-95 transition-all duration-150"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Playlist</span>
              </button>
              <div className="text-xs text-zinc-500 font-medium font-mono">
                {playlistSongs.length} {playlistSongs.length === 1 ? 'track' : 'tracks'}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Track Listing */}
        <div className="flex-1 overflow-hidden">
          <SongList songs={playlistSongs} onSongDeleted={() => loadPlaylistSongs(selectedPlaylist)} />
        </div>
      </div>
    );
  }

  // Primary Playlists page Grid
  return (
    <div className="h-full overflow-y-auto p-6" id="playlist-grid-view">
      {/* Title & Creator panel */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <span>My Smart Mixes & Collections</span>
        </h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex h-10 items-center gap-2 rounded-xl bg-purple-600/20 border border-purple-500/10 px-4 text-xs font-semibold text-purple-400 hover:bg-purple-600 hover:text-white transition-all duration-150"
        >
          <Plus className="h-4 w-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Inline Creation Input */}
      {isCreating && (
        <div className="mb-6 flex gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md max-w-md animate-slide-in">
          <input
            type="text"
            placeholder="Enter playlist title..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-white/5 bg-zinc-900 px-4 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
          />
          <button
            onClick={handleCreatePlaylist}
            className="h-10 px-4 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-500 transition-all active:scale-95"
          >
            Create
          </button>
          <button
            onClick={() => setIsCreating(false)}
            className="h-10 px-4 text-xs font-bold hover:bg-white/5 rounded-xl text-zinc-400"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Grid of smart + custom playlists */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
        {/* Preset Smart Playlists first */}
        {smartPlaylists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => selectPlaylist(pl)}
            className="group relative cursor-pointer flex flex-col rounded-2xl border border-white/5 bg-gradient-to-br from-zinc-900/10 to-zinc-900/30 p-4 hover:bg-zinc-900/60 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
          >
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-purple-600/10 flex items-center justify-center text-purple-400 border border-purple-500/10 shadow-md">
              {pl.id === 'smart_favorites' ? <Heart className="h-12 w-12 fill-current animate-pulse text-pink-500" /> : <ListMusic className="h-12 w-12" />}
              <button
                onClick={(e) => handlePlayPlaylist(e, pl)}
                className="absolute bottom-3 right-3 flex h-10 w-10 scale-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200"
              >
                <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
              </button>
            </div>
            <div className="mt-4 min-w-0">
              <h4 className="truncate text-sm font-bold text-zinc-100">{pl.name}</h4>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono font-bold">ALGORITHMIC MIX</p>
            </div>
          </div>
        ))}

        {/* Custom user playlists */}
        {playlists.map((pl) => (
          <div
            key={pl.id}
            onClick={() => selectPlaylist(pl)}
            className="group relative cursor-pointer flex flex-col rounded-2xl border border-white/5 bg-zinc-900/20 p-4 hover:bg-zinc-900/60 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
          >
            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5 shadow-md group-hover:text-purple-400">
              <ListMusic className="h-12 w-12" />
              
              <button
                onClick={(e) => handlePlayPlaylist(e, pl)}
                className="absolute bottom-3 right-3 flex h-10 w-10 scale-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200"
              >
                <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
              </button>

              {/* Delete custom playlist button */}
              <button
                onClick={(e) => handleDeletePlaylist(e, pl.id)}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950/80 text-red-400 border border-white/5 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                title="Delete Playlist"
              >
                <Trash className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 min-w-0">
              <h4 className="truncate text-sm font-bold text-zinc-100">{pl.name}</h4>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono font-bold">USER CREATED</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
