/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Disc, ArrowLeft } from 'lucide-react';
import { Album, AlbumRepository } from '../../electron/repositories/AlbumRepository';
import { CoverArt } from '../common/CoverArt';
import { useAppStore } from '../../store/useAppStore';
import { SongList } from './SongList';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';

export const AlbumGrid: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const { selectedAlbum, selectAlbum } = useAppStore();
  const { setQueue, playSong } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();

  const loadAlbums = async () => {
    try {
      const data = await AlbumRepository.getAll();
      setAlbums(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, [selectedAlbum]);

  const handlePlayAlbum = async (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    if (album.songs.length === 0) return;
    setQueue(album.songs);
    const firstSong = album.songs[0];
    playSong(firstSong);
    setCurrentSong(firstSong);
    try {
      await audioEngine.loadSong(firstSong);
      play();
    } catch {}
  };

  // Album Detail Sub-page View
  if (selectedAlbum) {
    return (
      <div className="flex h-full flex-col md:p-6 p-3 overflow-hidden">
        {/* Back navigation header */}
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => selectAlbum(null)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/60 border border-white/5 hover:bg-white/5 text-zinc-300 hover:text-white transition-all duration-150"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Album Details</h2>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">{selectedAlbum.title}</h1>
          </div>
        </div>

        {/* Detailed Info Card */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4 sm:mb-8 bg-zinc-900/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 backdrop-blur-md items-center sm:items-start text-center sm:text-left">
          <CoverArt songId={selectedAlbum.coverArtSongId} hasCover={!!selectedAlbum.coverArtSongId} className="h-24 w-24 sm:h-32 sm:w-32 md:h-40 md:w-40 flex-shrink-0" />
          <div className="flex flex-col justify-between py-1">
            <div>
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/10 px-2.5 py-1 rounded-full font-mono font-bold">ALBUM</span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight mt-3">{selectedAlbum.title}</h1>
              <p className="text-md sm:text-lg text-zinc-300 font-medium mt-1">{selectedAlbum.artist}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4">
              <button 
                onClick={(e) => handlePlayAlbum(e, selectedAlbum)}
                className="flex h-10 px-5 items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/20 active:scale-95 transition-all duration-150"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Play Album</span>
              </button>
              <div className="text-xs text-zinc-500 font-medium font-mono">
                {selectedAlbum.songCount} {selectedAlbum.songCount === 1 ? 'song' : 'songs'}
                {selectedAlbum.year ? ` • Released ${selectedAlbum.year}` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Track Listing */}
        <div className="flex-1 overflow-hidden">
          <SongList songs={selectedAlbum.songs} onSongDeleted={loadAlbums} />
        </div>
      </div>
    );
  }

  // Primary Albums Grid View
  return (
    <div className="h-full overflow-y-auto md:p-6 p-4" id="album-grid-view">
      {albums.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
          <Disc className="h-12 w-12 opacity-30 animate-pulse" />
          <p className="text-sm font-medium">No albums detected in your library yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-12">
          {albums.map((album, idx) => (
            <div
              key={`${album.artist}-${album.title}-${idx}`}
              onClick={() => selectAlbum(album)}
              className="group relative cursor-pointer flex flex-col rounded-2xl border border-white/5 bg-zinc-900/20 p-3 hover:bg-zinc-900/60 hover:border-white/10 active:scale-[0.98] transition-all duration-200"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-md">
                <CoverArt songId={album.coverArtSongId} hasCover={!!album.coverArtSongId} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                
                {/* Float Play Button Overlay */}
                <button
                  onClick={(e) => handlePlayAlbum(e, album)}
                  className="absolute bottom-3 right-3 flex h-10 w-10 scale-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200"
                >
                  <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
                </button>
              </div>

              {/* Description */}
              <div className="mt-3 min-w-0">
                <h4 className="truncate text-sm font-semibold text-zinc-100">{album.title}</h4>
                <p className="truncate text-xs text-zinc-400 mt-0.5">{album.artist}</p>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono font-bold">
                  {album.songCount} {album.songCount === 1 ? 'TRACK' : 'TRACKS'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
