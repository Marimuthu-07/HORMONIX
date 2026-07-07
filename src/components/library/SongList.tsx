/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Play, 
  Heart, 
  MoreVertical, 
  Clock, 
  Music, 
  Plus, 
  Trash,
  ArrowUpDown
} from 'lucide-react';
import { Song, Playlist } from '../../types';
import { CoverArt } from '../common/CoverArt';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { audioEngine } from '../../audio/AudioEngine';
import { useToastStore } from '../common/Toast';
import { ContextMenu } from '../common/ContextMenu';
import { SongRepository } from '../../electron/repositories/SongRepository';
import { db } from '../../database/db';

interface SongListProps {
  songs: Song[];
  onSongDeleted?: () => void;
  disableScroll?: boolean;
}

type SortField = 'title' | 'artist' | 'album' | 'addedAt' | 'playCount';
type SortOrder = 'asc' | 'desc';

export const SongList: React.FC<SongListProps> = ({ songs, onSongDeleted, disableScroll = false }) => {
  const { playSong, setQueue, addToQueue, playNext } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();

  const [sortField, setSortField] = useState<SortField>('title');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Lazy rendering windowing to achieve 60 FPS
  const [renderLimit, setRenderLimit] = useState(100);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song } | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    // Load playlists for context menu integration
    db.getAllPlaylists().then(setPlaylists).catch(console.error);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort and filter songs
  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      let aVal: any = a[sortField] || '';
      let bVal: any = b[sortField] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [songs, sortField, sortOrder]);

  // Infinite Scroll Trigger
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      if (renderLimit < sortedSongs.length) {
        setRenderLimit((prev) => Math.min(prev + 100, sortedSongs.length));
      }
    }
  };

  const visibleSongs = useMemo(() => {
    return sortedSongs.slice(0, renderLimit);
  }, [sortedSongs, renderLimit]);

  // Format Duration (e.g. 195 -> 3:15)
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleRowDoubleClick = async (song: Song) => {
    // When double clicking, replace the active queue with the sorted list and play selection!
    setQueue(sortedSongs);
    playSong(song);
    setCurrentSong(song);
    try {
      await audioEngine.loadSong(song);
      play();
    } catch (e) {
      showToast('Error loading audio track', 'error');
    }
  };

  const toggleFavorite = async (song: Song) => {
    const nextFav = !song.favorite;
    const updated = await SongRepository.toggleFavorite(song.id, nextFav);
    if (updated && onSongDeleted) {
      onSongDeleted(); // Notify parent to refresh query lists
    }
    showToast(nextFav ? 'Added to favorites' : 'Removed from favorites', 'success');
  };

  const deleteSong = async (songId: string) => {
    if (confirm('Are you sure you want to permanently delete this song from your library?')) {
      await SongRepository.delete(songId);
      showToast('Song deleted from library', 'success');
      if (onSongDeleted) onSongDeleted();
    }
  };

  const handleRightClick = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      song
    });
  };

  const addSongToPlaylist = async (playlistId: string, song: Song) => {
    try {
      await db.addSongToPlaylist(playlistId, song.id);
      showToast(`Added to playlist`, 'success');
    } catch (err) {
      showToast('Already added or failed to append to playlist', 'error');
    }
  };

  return (
    <div 
      onScroll={disableScroll ? undefined : handleScroll}
      className={disableScroll ? "w-full md:px-4 px-1 pb-4" : "h-full w-full overflow-y-auto md:px-4 px-1 pb-16"}
      id={disableScroll ? "songs-list-flat" : "songs-scroller"}
    >
      {songs.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-zinc-500 gap-3">
          <Music className="h-12 w-12 opacity-30" />
          <p className="text-sm font-medium">No songs available in this section.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b border-white/5 text-xs font-bold text-zinc-400">
                  <th className="py-3 pl-3 w-12">#</th>
                  <th className="py-3 w-12">Cover</th>
                  <th className="py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('title')}>
                    <span className="flex items-center gap-1.5">Title <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('artist')}>
                    <span className="flex items-center gap-1.5">Artist <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('album')}>
                    <span className="flex items-center gap-1.5">Album <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('playCount')}>
                    <span className="flex items-center gap-1.5">Plays <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="py-3 pr-3 w-20 text-right">
                    <Clock className="h-4 w-4 inline-block" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleSongs.map((song, idx) => (
                  <tr
                    key={`${song.id}-${idx}`}
                    onDoubleClick={() => handleRowDoubleClick(song)}
                    onContextMenu={(e) => handleRightClick(e, song)}
                    className="group border-b border-white/[0.02] hover:bg-white/5 text-sm text-zinc-300 transition-colors duration-150"
                  >
                    {/* ID index / play clicker */}
                    <td className="py-2.5 pl-3 text-zinc-500 font-mono text-xs">
                      <span className="group-hover:hidden">{idx + 1}</span>
                      <button 
                        onClick={() => handleRowDoubleClick(song)}
                        className="hidden group-hover:block text-purple-400 hover:text-purple-300"
                      >
                        <Play className="h-4.5 w-4.5 fill-current" />
                      </button>
                    </td>

                    {/* Album Art Cover thumbnail */}
                    <td className="py-2.5">
                      <CoverArt songId={song.id} hasCover={song.hasCover} className="h-9 w-9" />
                    </td>

                    {/* Title */}
                    <td className="py-2.5 font-semibold text-zinc-100 max-w-[200px] truncate">
                      {song.title}
                    </td>

                    {/* Artist */}
                    <td className="py-2.5 text-zinc-300 max-w-[150px] truncate">
                      {song.artist}
                    </td>

                    {/* Album */}
                    <td className="py-2.5 text-zinc-400 max-w-[150px] truncate font-medium">
                      {song.album}
                    </td>

                    {/* Play count */}
                    <td className="py-2.5 font-mono text-xs text-zinc-500">
                      {song.playCount || 0}
                    </td>

                    {/* Time duration & Quick operations */}
                    <td className="py-2.5 pr-3 text-right text-xs font-mono text-zinc-400 font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleFavorite(song)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded ${
                            song.favorite ? 'opacity-100 text-pink-500' : 'text-zinc-400 hover:text-zinc-100'
                          }`}
                        >
                          <Heart className="h-4.5 w-4.5 fill-current" />
                        </button>
                        <span>{formatDuration(song.duration)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based List View */}
          <div className="block md:hidden space-y-2 mt-2">
            {visibleSongs.map((song, idx) => (
              <div
                key={`${song.id}-${idx}-mobile`}
                onClick={() => handleRowDoubleClick(song)}
                onContextMenu={(e) => handleRightClick(e, song)}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/40 border border-white/5 active:bg-zinc-800/40 transition-all gap-3 select-none"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Compact Art Cover */}
                  <CoverArt songId={song.id} hasCover={song.hasCover} className="h-11 w-11 rounded-lg flex-shrink-0" />
                  
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-zinc-100">{song.title}</h4>
                    <p className="truncate text-xs text-zinc-400 mt-0.5">{song.artist}</p>
                    <p className="truncate text-[10px] text-zinc-500 mt-0.5">{song.album}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">{formatDuration(song.duration)}</span>
                  
                  {/* Favorite Toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(song);
                    }}
                    className={`p-1.5 rounded-lg active:scale-90 transition-all ${
                      song.favorite ? 'text-pink-500' : 'text-zinc-500'
                    }`}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>

                  {/* Context Actions menu trigger button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setContextMenu({
                        x: rect.left,
                        y: rect.bottom,
                        song
                      });
                    }}
                    className="p-1.5 text-zinc-400 active:scale-90"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dynamic Right Click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: 'Play Track Now',
              icon: <Play className="h-4 w-4" />,
              action: () => handleRowDoubleClick(contextMenu.song)
            },
            {
              label: 'Play Next in Queue',
              icon: <Plus className="h-4 w-4" />,
              action: () => {
                playNext(contextMenu.song);
                showToast('Scheduled to play next', 'success');
              }
            },
            {
              label: 'Add to Queue Backlog',
              icon: <Plus className="h-4 w-4" />,
              action: () => {
                addToQueue(contextMenu.song);
                showToast('Added to queue backlog', 'success');
              }
            },
            ...playlists.map((playlist) => ({
              label: `Add to: ${playlist.name}`,
              icon: <Plus className="h-4 w-4" />,
              action: () => addSongToPlaylist(playlist.id, contextMenu.song)
            })),
            {
              label: 'Favorite Track',
              icon: <Heart className="h-4 w-4" />,
              action: () => toggleFavorite(contextMenu.song)
            },
            {
              label: 'Delete Song From Library',
              icon: <Trash className="h-4 w-4" />,
              action: () => deleteSong(contextMenu.song.id),
              danger: true
            }
          ]}
        />
      )}
    </div>
  );
};
