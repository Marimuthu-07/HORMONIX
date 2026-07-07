/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Music, Disc, Users } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { db } from '../../database/db';
import { Song } from '../../types';
import { Album } from '../../electron/repositories/AlbumRepository';
import { Artist } from '../../electron/repositories/ArtistRepository';
import { SongList } from './SongList';
import { CoverArt } from '../common/CoverArt';

export const SearchView: React.FC = () => {
  const { searchQuery } = useAppStore();
  
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all tracks once to search instantly in-memory
  useEffect(() => {
    setLoading(true);
    db.getAllSongs()
      .then((songs) => {
        setAllSongs(songs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [searchQuery]);

  // Process instant matching results
  const results = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return { songs: [], albums: [], artists: [] };
    }

    // Match songs
    const matchedSongs = allSongs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.album.toLowerCase().includes(query)
    );

    // Group matching albums
    const albumMap = new Map<string, Album>();
    matchedSongs.forEach((song) => {
      const key = `${song.artist}-${song.album}`;
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          title: song.album,
          artist: song.artist,
          coverArtSongId: song.id,
          songCount: 1,
          songs: [song]
        });
      } else {
        const item = albumMap.get(key)!;
        item.songCount += 1;
        item.songs.push(song);
      }
    });

    // Group matching artists
    const artistMap = new Map<string, Artist>();
    matchedSongs.forEach((song) => {
      if (!artistMap.has(song.artist)) {
        artistMap.set(song.artist, {
          name: song.artist,
          songCount: 1,
          albumCount: 1,
          albums: song.album ? [song.album] : [],
          songs: [song]
        });
      } else {
        const item = artistMap.get(song.artist)!;
        item.songCount += 1;
        item.songs.push(song);
        if (song.album && !item.albums.includes(song.album)) {
          item.albums.push(song.album);
          item.albumCount = item.albums.length;
        }
      }
    });

    return {
      songs: matchedSongs,
      albums: Array.from(albumMap.values()),
      artists: Array.from(artistMap.values())
    };
  }, [allSongs, searchQuery]);

  const { selectAlbum, selectArtist } = useAppStore();

  if (!searchQuery.trim()) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
        <Search className="h-12 w-12 opacity-30 animate-pulse" />
        <p className="text-sm font-medium">Type in the top bar to search catalog songs, albums, and artists instantly.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6" id="search-view-page">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Search outcomes for</h2>
        <h1 className="text-2xl font-black text-zinc-100 italic">"{searchQuery}"</h1>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-400 font-mono">Searching IndexedDB recordsets...</p>
      ) : results.songs.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
          <Search className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No results matched your search parameter. Check folders and re-scan.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 pb-12">
          {/* Artists Matches Grid Row */}
          {results.artists.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" />
                <span>Artists Matched ({results.artists.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {results.artists.slice(0, 6).map((artist) => (
                  <div
                    key={artist.name}
                    onClick={() => selectArtist(artist)}
                    className="cursor-pointer flex flex-col items-center bg-zinc-900/20 p-4 border border-white/5 rounded-2xl hover:bg-zinc-900/60 hover:border-white/10 transition-all duration-150"
                  >
                    <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5 shadow-md">
                      <Users className="h-6 w-6" />
                    </div>
                    <h4 className="truncate text-xs font-bold text-zinc-100 mt-3 text-center w-full">{artist.name}</h4>
                    <span className="text-[9px] text-zinc-500 font-mono mt-1 font-bold uppercase">{artist.songCount} SONGS</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Albums Matches Grid Row */}
          {results.albums.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Disc className="h-4 w-4 text-purple-400" />
                <span>Albums Matched ({results.albums.length})</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {results.albums.slice(0, 6).map((album) => (
                  <div
                    key={`${album.artist}-${album.title}`}
                    onClick={() => selectAlbum(album)}
                    className="cursor-pointer flex flex-col bg-zinc-900/20 p-3 border border-white/5 rounded-2xl hover:bg-zinc-900/60 hover:border-white/10 transition-all duration-150"
                  >
                    <CoverArt songId={album.coverArtSongId} hasCover={!!album.coverArtSongId} className="aspect-square w-full rounded-xl object-cover" />
                    <h4 className="truncate text-xs font-bold text-zinc-100 mt-2">{album.title}</h4>
                    <p className="truncate text-[10px] text-zinc-400 mt-0.5">{album.artist}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Songs Matches Table Column */}
          <div>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Music className="h-4 w-4 text-purple-400" />
              <span>Songs Matched ({results.songs.length})</span>
            </h3>
            <SongList songs={results.songs} disableScroll />
          </div>
        </div>
      )}
    </div>
  );
};
