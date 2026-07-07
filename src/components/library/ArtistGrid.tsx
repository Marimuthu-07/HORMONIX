/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Users, ArrowLeft } from 'lucide-react';
import { Artist, ArtistRepository } from '../../electron/repositories/ArtistRepository';
import { CoverArt } from '../common/CoverArt';
import { useAppStore } from '../../store/useAppStore';
import { SongList } from './SongList';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';

export const ArtistGrid: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const { selectedArtist, selectArtist } = useAppStore();
  const { setQueue, playSong } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();

  const loadArtists = async () => {
    try {
      const data = await ArtistRepository.getAll();
      setArtists(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadArtists();
  }, [selectedArtist]);

  const handlePlayArtist = async (e: React.MouseEvent, artist: Artist) => {
    e.stopPropagation();
    if (artist.songs.length === 0) return;
    setQueue(artist.songs);
    const firstSong = artist.songs[0];
    playSong(firstSong);
    setCurrentSong(firstSong);
    try {
      await audioEngine.loadSong(firstSong);
      play();
    } catch {}
  };

  // Artist Detail Sub-page View
  if (selectedArtist) {
    return (
      <div className="flex h-full flex-col md:p-6 p-3 overflow-hidden">
        {/* Back navigation header */}
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => selectArtist(null)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/60 border border-white/5 hover:bg-white/5 text-zinc-300 hover:text-white transition-all duration-150"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Artist Profiles</h2>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">{selectedArtist.name}</h1>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-8 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 backdrop-blur-md items-center sm:items-start text-center sm:text-left">
          <div className="h-20 w-20 sm:h-28 sm:w-28 md:h-36 md:w-36 rounded-full border border-purple-500/10 bg-purple-500/5 flex flex-shrink-0 items-center justify-center text-purple-400 shadow-md">
            <Users className="h-8 w-8 sm:h-12 sm:w-12" />
          </div>
          <div className="flex flex-col justify-between py-1">
            <div>
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/10 px-2.5 py-1 rounded-full font-mono font-bold">ARTIST</span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight mt-3">{selectedArtist.name}</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4">
              <button 
                onClick={(e) => handlePlayArtist(e, selectedArtist)}
                className="flex h-10 px-5 items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/20 active:scale-95 transition-all duration-150"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Catalog</span>
              </button>
              <div className="text-xs text-zinc-500 font-medium font-mono">
                {selectedArtist.songCount} {selectedArtist.songCount === 1 ? 'song' : 'songs'} • {selectedArtist.albumCount} {selectedArtist.albumCount === 1 ? 'album' : 'albums'}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Track Listing */}
        <div className="flex-1 overflow-hidden">
          <SongList songs={selectedArtist.songs} onSongDeleted={loadArtists} />
        </div>
      </div>
    );
  }

  // Primary Artists Grid View
  return (
    <div className="h-full overflow-y-auto p-6" id="artist-grid-view">
      {artists.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
          <Users className="h-12 w-12 opacity-30 animate-pulse" />
          <p className="text-sm font-medium">No artists parsed in library folders yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
          {artists.map((artist, idx) => (
            <div
              key={`${artist.name}-${idx}`}
              onClick={() => selectArtist(artist)}
              className="group relative cursor-pointer flex flex-col items-center text-center rounded-2xl border border-white/5 bg-zinc-900/20 p-5 hover:bg-zinc-900/60 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
            >
              {/* Thumbnail Container */}
              <div className="relative h-28 w-28 rounded-full overflow-hidden shadow-lg border border-white/5 bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-purple-400 transition-colors">
                <Users className="h-10 w-10 opacity-60" />
                
                {/* Float Play Button Overlay */}
                <button
                  onClick={(e) => handlePlayArtist(e, artist)}
                  className="absolute inset-0 m-auto flex h-10 w-10 scale-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200"
                >
                  <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                </button>
              </div>

              {/* Description */}
              <div className="mt-4 min-w-0 w-full">
                <h4 className="truncate text-sm font-bold text-zinc-100">{artist.name}</h4>
                <div className="text-[10px] text-zinc-500 mt-1.5 font-mono font-bold">
                  {artist.songCount} {artist.songCount === 1 ? 'SONG' : 'SONGS'} • {artist.albumCount} {artist.albumCount === 1 ? 'ALBUM' : 'ALBUMS'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
