import React, { useState, useMemo } from 'react';
import { Track, Theme } from '../types';
import { Search, Music, Disc, Play, SlidersHorizontal, Sliders, Clock, ArrowRight, Sparkles, Filter, BadgeAlert, BadgeInfo } from 'lucide-react';

interface SearchPanelProps {
  playlist: Track[];
  onSelectTrack: (index: number) => void;
  theme: Theme;
  onSelectArtist: (artistName: string) => void;
  onSelectAlbum: (albumName: string) => void;
}

export default function SearchPanel({
  playlist,
  onSelectTrack,
  theme,
  onSelectArtist,
  onSelectAlbum
}: SearchPanelProps) {
  const [query, setQuery] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [maxDuration, setMaxDuration] = useState<number>(600); // Up to 10 minutes (600 seconds)
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Suggested keywords
  const trendingTags = ['Synthwave', 'Horizon', 'Cyber', 'Midnight', 'Retro', 'Arcade', 'Drive', 'Procedural'];

  // Categories tags filters
  const filterGenres = ['all', 'Synthwave', 'Electronic', 'Lofi', 'Ambient', 'Procedural'];

  // Filter tracklist
  const results = useMemo(() => {
    let list = playlist;

    // Filter by Query
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      );
    }

    // Filter by Duration limits
    list = list.filter(t => t.duration <= maxDuration);

    // Filter by Genre (simulated tag parsing)
    if (selectedGenre !== 'all') {
      list = list.filter((t, i) => {
        const isSynth = t.coverUrl === 'synthwave' || t.format === 'SYNTH';
        if (selectedGenre.toLowerCase() === 'synthwave' && isSynth) return true;
        if (selectedGenre.toLowerCase() === 'procedural' && t.id === 'synth-loop') return true;
        if (selectedGenre.toLowerCase() === 'electronic' && t.format === 'MP3' && i % 2 === 0) return true;
        if (selectedGenre.toLowerCase() === 'lofi' && t.title.toLowerCase().includes('sunset')) return true;
        if (selectedGenre.toLowerCase() === 'ambient' && i % 2 !== 0) return true;
        return false;
      });
    }

    return list;
  }, [playlist, query, selectedGenre, maxDuration]);

  // Aggregate results by albums & artists
  const matchedAlbums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; coverUrl?: string }>();
    results.forEach(t => {
      if (!map.has(t.album)) {
        map.set(t.album, { name: t.album, artist: t.artist, coverUrl: t.coverUrl });
      }
    });
    return Array.from(map.values());
  }, [results]);

  const matchedArtists = useMemo(() => {
    const map = new Set<string>();
    results.forEach(t => map.add(t.artist));
    return Array.from(map);
  }, [results]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleSelectTrackById = (id: string) => {
    const idx = playlist.findIndex(t => t.id === id);
    if (idx !== -1) {
      onSelectTrack(idx);
    }
  };

  return (
    <div className="space-y-6 select-none" id="neonwave-search-grid">
      
      {/* 1. MAIN GLOBAL HEADING & INPUT BAR */}
      <div className="flex flex-col gap-3.5">
        <h2 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">EXPLORATION PORTAL</h2>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={17} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, artist, album, format type..."
              className="w-full bg-[#111827] outline-none text-sm text-white border border-white/5 hover:border-white/10 focus:border-violet-500 rounded-xl py-3 px-11 transition-all shadow-[0_4px_10px_rgba(0,0,0,0.3)] font-sans"
              id="global-search-query-field"
            />
          </div>

          <button
            onClick={() => setShowFilters(prev => !prev)}
            className={`cursor-pointer border p-3 rounded-xl transition-all duration-150 flex items-center justify-center outline-none ${
              showFilters 
                ? 'bg-linear-to-r from-violet-600 to-indigo-600 border-violet-500 text-white' 
                : 'bg-zinc-900 border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Detailed Filters"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Dynamic Tag Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-400 pl-1">
          <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1 mr-1">
            <Sparkles size={11} className="text-amber-500 animate-pulse" />
            <span>Search suggestions:</span>
          </span>
          {trendingTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-full px-2.5 py-0.5 text-[10.5px] transition-colors"
            >
              #{tag.toLowerCase()}
            </button>
          ))}
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="cursor-pointer text-amber-500 hover:text-white text-[10.5px] font-bold underline ml-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 2. ADVANCED COLLAPSIBLE FILTERS BAR */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-5" id="search-filter-controls">
          {/* Genre Category chips */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1">
              <Filter size={10} style={{ color: theme.primary }} />
              <span>Genre Categorization Preset</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {filterGenres.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`cursor-pointer text-[10.5px] font-bold px-3 py-1 rounded-lg border transition-all ${
                    selectedGenre === g 
                      ? 'bg-white text-black border-white' 
                      : 'bg-black/30 text-zinc-400 border-white/5 hover:text-zinc-200'
                  }`}
                  style={selectedGenre === g ? { backgroundColor: theme.primary, color: '#000000', borderColor: theme.primary } : {}}
                >
                  {g === 'all' ? 'All Classes' : g}
                </button>
              ))}
            </div>
          </div>

          {/* Duration slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Clock size={10} style={{ color: theme.secondary }} />
                <span>Maximum Audio Duration Limit</span>
              </span>
              <span className="font-mono text-[#00e5ff]">{formatDuration(maxDuration)}</span>
            </div>
            <input
              type="range"
              min="30"
              max="600"
              step="15"
              value={maxDuration}
              onChange={(e) => setMaxDuration(parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer outline-none"
              style={{ accentColor: theme.secondary }}
            />
            <div className="flex justify-between text-[8px] font-mono text-zinc-600">
              <span>30 sec</span>
              <span>5 min</span>
              <span>10 min max</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. GRID MATCHED CATEGORIES LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="search-categorized-deck">
        
        {/* PANEL A: MATCHED SONGS ROW */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Matched Title Tracks ({results.length})</h3>
          
          {results.length === 0 ? (
            <div className="bg-[#111827]/40 rounded-xl p-16 border border-dashed border-zinc-900 text-center text-zinc-500 font-sans" id="search-empty-indicator">
              <BadgeAlert className="mx-auto text-zinc-700 mb-2" size={24} />
              <h4 className="font-semibold text-xs text-zinc-400">Search Empty</h4>
              <p className="text-[10px] text-zinc-600 mt-1">No tracks matching current filter query parameters found.</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1" id="search-tracks-deck">
              {results.map((track) => {
                const isSynth = track.coverUrl === 'synthwave';
                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrackById(track.id)}
                    className="p-2.5 rounded-xl bg-zinc-900/10 hover:bg-zinc-900/50 border border-white/[0.02] hover:border-white/10 flex items-center justify-between group cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-zinc-950 rounded overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5 relative">
                        {isSynth ? (
                          <div className="w-full h-full bg-linear-to-tr from-slate-900 to-indigo-950 flex items-center justify-center">
                            <Disc size={13} className="text-slate-500" />
                          </div>
                        ) : track.coverUrl ? (
                          <img src={track.coverUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <Music size={13} className="text-zinc-650" />
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={10} className="text-white fill-white" />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-[#00e5ff] transition-colors truncate">{track.title}</h4>
                        <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{track.artist} &bull; <span className="text-zinc-600 font-normal">{track.album}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
                      <span className="hidden sm:inline bg-zinc-950 px-1.5 py-0.2 rounded text-[8.5px] border border-white/5 text-zinc-400">
                        {track.format}
                      </span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL B: MATCHED ALBUMS & ARTISTS */}
        <div className="flex flex-col gap-5">
          {/* Matches Albums */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Resonating Albums ({matchedAlbums.length})</h3>
            {matchedAlbums.length === 0 ? (
              <div className="text-[10.5px] text-zinc-600 bg-[#111827]/30 rounded-xl p-4 text-center">No matching albums</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
                {matchedAlbums.slice(0, 4).map((album, idx) => {
                  const isSynth = album.coverUrl === 'synthwave';
                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectAlbum(album.name)}
                      className="cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/20 p-2 rounded-xl border border-white/5 flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded bg-zinc-950 overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                        {isSynth ? (
                          <div className="w-full h-full bg-linear-to-tr from-slate-900 to-indigo-950 flex items-center justify-center">
                            <Disc size={11} className="text-violet-500" />
                          </div>
                        ) : album.coverUrl ? (
                          <img src={album.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Music size={11} className="text-zinc-700" />
                        )}
                      </div>

                      <div className="min-w-0 flex-grow">
                        <h4 className="text-[11.5px] font-bold text-white group-hover:text-[#00e5ff] transition-colors truncate">{album.name}</h4>
                        <p className="text-[9.5px] text-zinc-500 truncate">{album.artist}</p>
                      </div>

                      <ArrowRight size={10} className="text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Matched Artists */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Matched Creators ({matchedArtists.length})</h3>
            {matchedArtists.length === 0 ? (
              <div className="text-[10.5px] text-zinc-600 bg-[#111827]/30 rounded-xl p-4 text-center">No matching creators</div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[25vh] overflow-y-auto custom-scrollbar pr-1">
                {matchedArtists.slice(0, 4).map((artistName, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectArtist(artistName)}
                    className="cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/20 p-2 rounded-xl border border-white/5 flex items-center gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-900 to-purple-800 flex items-center justify-center text-white border border-white/10 font-bold font-mono text-[9.5px]">
                      {artistName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <h4 className="text-[11.5px] font-bold text-white group-hover:text-[#00e5ff] transition-colors truncate">{artistName}</h4>
                      <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wide">Audio Master Creator</p>
                    </div>
                    <ArrowRight size={10} className="text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
