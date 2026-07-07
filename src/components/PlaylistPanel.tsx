import React, { useState, useMemo } from 'react';
import { Track, Theme } from '../types';
import { 
  Plus, Settings, ListMusic, Trash2, ArrowUp, ArrowDown, Sparkles, AlertCircle, Play, Music, Edit, Save, 
  X, Image, Heart, Disc, List, LayoutGrid, Check
} from 'lucide-react';

interface PlaylistData {
  id: string;
  name: string;
  description: string;
  coverUrl: string; // Dynamic preset color key or actual image link
  trackIds: string[];
}

interface PlaylistPanelProps {
  playlist: Track[]; // Master tracks library
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  theme: Theme;
  customPlaylists: PlaylistData[];
  onCreatePlaylist: (name: string, desc: string, cover: string) => void;
  onUpdatePlaylistTracks: (playlistId: string, trackIds: string[]) => void;
  onDeletePlaylist: (id: string) => void;
}

// Neon skin presets for playlist covers
const GRADIENT_PRESETS = [
  { id: 'neon-violet', name: 'Cyber Indigo', Style: 'from-[#7C4DFF] via-[#00E5FF] to-[#111827]' },
  { id: 'neon-warm', name: 'Coral Horizon', Style: 'from-[#FF4D9D] via-[#FFC107] to-[#111827]' },
  { id: 'neon-cyan', name: 'Deep Cyan', Style: 'from-[#00E5FF] via-[#00C853] to-[#111827]' },
  { id: 'neon-mint', name: 'Toxic Emerald', Style: 'from-[#00C853] via-[#FFC107] to-[#111827]' },
  { id: 'neon-magma', name: 'Lava Fusion', Style: 'from-[#FF4D9D] via-[#b026ff] to-[#111827]' },
  { id: 'neon-midnight', name: 'Nox Starfield', Style: 'from-slate-900 via-[#1A2333] to-neutral-950' }
];

export default function PlaylistPanel({
  playlist,
  currentTrackIndex,
  onSelectTrack,
  theme,
  customPlaylists,
  onCreatePlaylist,
  onUpdatePlaylistTracks,
  onDeletePlaylist
}: PlaylistPanelProps) {
  // Navigation
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState<boolean>(false);

  // Creator form state
  const [newName, setNewName] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [selectedCover, setSelectedCover] = useState<string>('neon-violet');

  // Track additions bar state
  const [showAddTracksBar, setShowAddTracksBar] = useState<boolean>(false);

  // Active loaded playlist object
  const activePlaylist = useMemo(() => {
    return customPlaylists.find(p => p.id === selectedPlaylistId) || null;
  }, [customPlaylists, selectedPlaylistId]);

  // Tracks compiled inside selected playlist
  const playlistTracks = useMemo(() => {
    if (!activePlaylist) return [];
    return activePlaylist.trackIds
      .map(id => playlist.find(t => t.id === id))
      .filter((t): t is Track => !!t);
  }, [activePlaylist, playlist]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreatePlaylist(newName, newDesc, selectedCover);
    setNewName('');
    setNewDesc('');
    setSelectedCover('neon-violet');
    setShowCreator(false);
  };

  // Up & Down Track reordering logic
  const handleShiftTrack = (index: number, direction: 'up' | 'down') => {
    if (!activePlaylist) return;
    const ids = [...activePlaylist.trackIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;

    // Checks offset bounding
    if (targetIdx < 0 || targetIdx >= ids.length) return;

    // Swap elements
    const temp = ids[index];
    ids[index] = ids[targetIdx];
    ids[targetIdx] = temp;

    onUpdatePlaylistTracks(activePlaylist.id, ids);
  };

  // Remove track from list
  const handleRemoveTrackFromPlaylist = (trackId: string) => {
    if (!activePlaylist) return;
    const ids = activePlaylist.trackIds.filter(id => id !== trackId);
    onUpdatePlaylistTracks(activePlaylist.id, ids);
  };

  // Append track into custom playlist list
  const handleAppendTrack = (trackId: string) => {
    if (!activePlaylist) return;
    if (activePlaylist.trackIds.includes(trackId)) return;
    const ids = [...activePlaylist.trackIds, trackId];
    onUpdatePlaylistTracks(activePlaylist.id, ids);
  };

  const handlePlaySongById = (id: string) => {
    const idx = playlist.findIndex(t => t.id === id);
    if (idx !== -1) {
      onSelectTrack(idx);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 select-none" id="neonwave-playlist-manager">
      
      {activePlaylist ? (
        /* VIEW A: DETAILED CHOSEN CUSTOM PLAYLIST */
        <div className="space-y-5" id="playlist-expanded-details">
          
          {/* Header Card */}
          <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
            <button
              onClick={() => setSelectedPlaylistId(null)}
              className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-white/5 p-2 rounded-xl text-zinc-400 hover:text-white transition-colors flex items-center justify-center outline-none mr-2"
              title="Return to playlists list"
            >
              <X size={15} />
            </button>

            {/* Render chosen jacket */}
            {(() => {
              const activeCoverPreset = GRADIENT_PRESETS.find(p => p.id === activePlaylist.coverUrl);
              const customGradientStyle = activeCoverPreset ? activeCoverPreset.Style : GRADIENT_PRESETS[0].Style;
              return (
                <div className={`w-28 h-28 rounded-2xl bg-gradient-to-tr ${customGradientStyle} flex items-center justify-center shadow-lg border border-white/10 flex-shrink-0 relative group`}>
                  <ListMusic size={35} className="text-zinc-200" />
                </div>
              );
            })()}

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">CUSTOM DIRECT PLAYLIST</span>
              <h1 className="text-xl md:text-2xl font-black text-white truncate leading-tight uppercase tracking-tight">{activePlaylist.name}</h1>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">{activePlaylist.description || 'No description assigned for this custom set.'}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10.5px] font-mono text-zinc-500 py-0.5 px-2 bg-zinc-950 rounded-full border border-white/5">
                  Compilation: {playlistTracks.length} tracks
                </span>
                
                <button
                  onClick={() => setShowAddTracksBar(prev => !prev)}
                  className={`cursor-pointer px-2.5 py-0.5 text-[10.5px] font-bold border rounded-full transition-all flex items-center gap-1 ${
                    showAddTracksBar 
                      ? 'bg-linear-to-r from-violet-600 to-indigo-600 border-violet-500 text-white' 
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border-white/5'
                  }`}
                >
                  <Plus size={10} />
                  <span>Append Tracks</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm(`Delete playlist "${activePlaylist.name}" permanently?`)) {
                  onDeletePlaylist(activePlaylist.id);
                  setSelectedPlaylistId(null);
                }
              }}
              className="cursor-pointer bg-zinc-950 hover:bg-[#ff4d9d]/15 p-2 rounded-xl text-zinc-500 hover:text-[#ff4d9d] border border-white/5 hover:border-[#ff4d9d]/20 transition-all ml-auto"
              title="Delete Playlist"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Expanded panel Append list */}
          {showAddTracksBar && (
            <div className="p-3 bg-zinc-900/30 rounded-2xl border border-white/5 space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-1 font-mono">Select tracks from your absolute inventory to append:</h4>
              <div className="flex flex-col gap-1.5 max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
                {playlist.filter(t => !activePlaylist.trackIds.includes(t.id)).length === 0 ? (
                  <div className="text-[10px] text-zinc-600 italic text-center py-2">All loaded tracks are already mapped to this playlist.</div>
                ) : (
                  playlist.filter(t => !activePlaylist.trackIds.includes(t.id)).map(t => (
                    <div 
                      key={t.id}
                      onClick={() => handleAppendTrack(t.id)}
                      className="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-between text-xs text-zinc-300 group transition-all"
                    >
                      <span className="truncate group-hover:text-white">{t.title} - <span className="text-zinc-500">{t.artist}</span></span>
                      <button className="text-[9.5px] font-bold text-emerald-400 hover:scale-105 transition-transform flex items-center gap-1">
                        <Plus size={10} className="text-emerald-400" />
                        <span>Map Song</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Table display */}
          {playlistTracks.length === 0 ? (
            <div className="bg-zinc-950/20 border border-dashed border-zinc-900 rounded-2xl p-16 text-center text-zinc-500 text-xs">
              <ListMusic size={26} className="mx-auto mb-2 text-zinc-700 animate-bounce" />
              <h4 className="font-semibold text-zinc-400">Playlist Empty</h4>
              <p className="text-[10px] text-zinc-650 mt-1">Append tracks into this custom compilation by tapping "Append Tracks" above.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto custom-scrollbar" id="playlist-tracks-expanded">
              {playlistTracks.map((track, idx) => {
                const globalIdx = playlist.findIndex(t => t.id === track.id);
                return (
                  <div
                    key={track.id}
                    className="p-2 bg-zinc-900/10 hover:bg-zinc-900/30 border border-white/[0.02] hover:border-white/10 rounded-xl flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0" onClick={() => handlePlaySongById(track.id)}>
                      <span className="text-[10px] font-mono text-zinc-600 w-4 text-center cursor-pointer group-hover:text-white transition-colors">{idx + 1}</span>
                      <div className="w-8 h-8 rounded overflow-hidden bg-zinc-950 flex-shrink-0 flex items-center justify-center border border-white/5 cursor-pointer relative">
                        {track.coverUrl === 'synthwave' ? (
                          <div className="w-full h-full bg-linear-to-tr from-slate-900 to-indigo-950 flex items-center justify-center">
                            <Disc size={11} className="text-violet-500" />
                          </div>
                        ) : track.coverUrl ? (
                          <img src={track.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Music size={11} className="text-zinc-650" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                          <Play size={10} className="text-white fill-white" />
                        </div>
                      </div>
                      <div className="min-w-0 cursor-pointer">
                        <h4 className="text-xs font-bold truncate text-white uppercase tracking-tight group-hover:text-[#00e5ff] transition-colors">{track.title}</h4>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-500 text-[10px] font-mono" onClick={e => e.stopPropagation()}>
                      {/* Shift buttons */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleShiftTrack(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Shift Index Higher"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          onClick={() => handleShiftTrack(idx, 'down')}
                          disabled={idx === playlistTracks.length - 1}
                          className="p-1.5 rounded hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Shift Index Lower"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>

                      <span className="w-10 text-right pr-2">{formatTime(track.duration)}</span>
                      
                      <button
                        onClick={() => handleRemoveTrackFromPlaylist(track.id)}
                        className="p-1 px-1.5 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                        title="Unmap Song"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW B: COMPILATION GRID OF ALL PLAYLISTS */
        <div className="space-y-4" id="playlists-root-grid">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Personal compilations ({customPlaylists.length})</h3>
            
            <button
              onClick={() => setShowCreator(prev => !prev)}
              className="cursor-pointer bg-zinc-950 hover:bg-zinc-900 border border-white/5 p-2 rounded-xl text-xs font-semibold flex items-center gap-1 text-white hover:border-violet-500 transition-colors"
            >
              <Plus size={12} className="text-[#00e5ff]" />
              <span>Compose Playlist</span>
            </button>
          </div>

          {/* Form Creator inline dialog */}
          {showCreator && (
            <form onSubmit={handleCreate} className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col gap-3 max-w-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>COMPOSE DIRECTORY PLAYLIST</span>
                </span>
                <button type="button" onClick={() => setShowCreator(false)} className="text-zinc-500 hover:text-white"><X size={13} /></button>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Playlist Name..."
                  required
                  className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-violet-500 rounded-lg p-2 text-xs text-white outline-none font-sans"
                />
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description..."
                  rows={2}
                  className="w-full bg-black/40 border border-white/5 hover:border-white/10 focus:border-violet-500 rounded-lg p-2 text-xs text-white outline-none font-sans"
                />

                {/* Sizing Skin Presets */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">Custom Color Identity Skin</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 select-none text-[9.5px]">
                    {GRADIENT_PRESETS.map((p) => {
                      const isActive = selectedCover === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedCover(p.id)}
                          className={`cursor-pointer h-10 rounded-lg bg-gradient-to-tr ${p.Style} group transition-all relative flex flex-col items-center justify-center font-bold text-zinc-300 hover:text-white border ${
                            isActive ? 'border-white scale-[1.03]' : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          <span className="truncate max-w-[50px]">{p.name.replace('Cyber ', '')}</span>
                          {isActive && <Check size={8} className="absolute bottom-1 right-1 text-[#00e5ff]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="cursor-pointer bg-linear-to-r from-violet-600 to-indigo-600 text-white font-extrabold p-2 rounded-xl text-xs transition-transform hover:scale-[1.02] outline-none"
              >
                CREATE PLAYLIST
              </button>
            </form>
          )}

          {/* Grid compilations layout */}
          {customPlaylists.length === 0 ? (
            <div className="bg-[#111827]/30 border border-zinc-900 rounded-2xl p-16 text-center text-zinc-500 font-sans">
              <ListMusic className="mx-auto mb-2 text-zinc-700" size={24} />
              <h4 className="font-semibold text-zinc-400">No Playlists</h4>
              <p className="text-[10px] text-zinc-650 mt-1">Create personal customized compilations for seamless playback.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="playlists-matrix-deck">
              {customPlaylists.map((playlistItem) => {
                const activeCoverPreset = GRADIENT_PRESETS.find(p => p.id === playlistItem.coverUrl);
                const customGradientStyle = activeCoverPreset ? activeCoverPreset.Style : GRADIENT_PRESETS[0].Style;
                return (
                  <div
                    key={playlistItem.id}
                    onClick={() => setSelectedPlaylistId(playlistItem.id)}
                    className="cursor-pointer bg-zinc-900/20 hover:bg-zinc-800/20 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-transform hover:-translate-y-1 duration-150 flex flex-col gap-3 group"
                  >
                    <div className={`relative aspect-square w-full rounded-xl bg-gradient-to-tr ${customGradientStyle} flex items-center justify-center shadow-md`}>
                      <ListMusic size={30} className="text-zinc-200 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-100 truncate group-hover:text-[#00e5ff] uppercase tracking-tight transition-all">{playlistItem.name}</h4>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{playlistItem.description || 'Custom music collection'}</p>
                      <span className="inline-block mt-2 text-[8.5px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-0.2 rounded-full border border-white/5">
                        {playlistItem.trackIds.length} tracks
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
