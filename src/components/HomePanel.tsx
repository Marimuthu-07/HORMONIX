import React from 'react';
import { Track, Theme } from '../types';
import { Play, Sparkles, TrendingUp, Music, Star, ArrowRight, Radio, Heart, Disc } from 'lucide-react';
import { motion } from 'motion/react';

interface HomePanelProps {
  playlist: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onSelectTrack: (index: number) => void;
  onTogglePlay: () => void;
  theme: Theme;
  recentlyPlayed: Track[];
  favorites: Track[];
  onSelectArtist: (artistName: string) => void;
  onSelectAlbum: (albumName: string) => void;
  onToggleFavorite: (trackId: string) => void;
  isFavorited: (trackId: string) => boolean;
}

export default function HomePanel({
  playlist,
  currentTrack,
  isPlaying,
  onSelectTrack,
  onTogglePlay,
  theme,
  recentlyPlayed,
  favorites,
  onSelectArtist,
  onSelectAlbum,
  onToggleFavorite,
  isFavorited
}: HomePanelProps) {
  // Generate mock albums and artists dynamically from tracklist to maintain real-time reactivity
  const albums = React.useMemo(() => {
    const list: Array<{ name: string; artist: string; coverUrl?: string; trackIds: string[] }> = [];
    playlist.forEach(t => {
      const existing = list.find(a => a.name === t.album);
      if (existing) {
        existing.trackIds.push(t.id);
      } else {
        list.push({
          name: t.album,
          artist: t.artist,
          coverUrl: t.coverUrl,
          trackIds: [t.id]
        });
      }
    });
    return list;
  }, [playlist]);

  const artists = React.useMemo(() => {
    const list: Array<{ name: string; avatarUrl?: string; genre: string; trackIds: string[] }> = [];
    playlist.forEach((t, i) => {
      const existing = list.find(a => a.name === t.artist);
      if (existing) {
        existing.trackIds.push(t.id);
      } else {
        // Fallback procedural avatars
        list.push({
          name: t.artist,
          avatarUrl: t.coverUrl === 'synthwave' ? undefined : t.coverUrl,
          genre: i % 2 === 0 ? 'Retro Synthwave' : 'Ambient Space-Out',
          trackIds: [t.id]
        });
      }
    });
    return list;
  }, [playlist]);

  const handlePlaySongById = (id: string) => {
    const idx = playlist.findIndex(t => t.id === id);
    if (idx !== -1) {
      onSelectTrack(idx);
    }
  };

  const isProceduralSynth = currentTrack?.coverUrl === 'synthwave';

  return (
    <div className="space-y-8 select-none" id="neonwave-home-shell">
      {/* 1. DYNAMIC BANNER HERO */}
      <div 
        className="rounded-2xl p-6 md:p-8 border flex flex-col md:flex-row gap-6 md:gap-8 items-center relative overflow-hidden transition-all duration-300 shadow-[0_15px_30px_rgba(0,0,0,0.5)] bg-linear-to-b"
        style={{ 
          backgroundImage: `linear-gradient(135deg, rgba(17,24,39,0.98) 0%, ${theme.primary}12 100%)`,
          borderColor: 'rgba(255,255,255,0.06)' 
        }}
        id="home-primary-banner"
      >
        {/* Animated backdrop glow halo */}
        <span 
          className="absolute -right-12 -bottom-12 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-25 animate-pulse"
          style={{ background: theme.primary }}
        />

        {/* Dynamic Cover Artwork */}
        <div className="relative w-36 h-36 md:w-40 md:h-40 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.6)] flex-shrink-0 group">
          {isProceduralSynth ? (
            <div className="w-full h-full bg-linear-to-tr from-slate-900 via-zinc-950 to-indigo-950 flex items-center justify-center">
              <Disc size={56} className="text-[#00e5ff] animate-spin-slow" />
            </div>
          ) : currentTrack?.coverUrl ? (
            <img 
              src={currentTrack.coverUrl} 
              alt="" 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <Music size={46} className="text-zinc-700 animate-pulse" />
            </div>
          )}

          <div 
            className="absolute inset-0 bg-black/40 hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
          >
            <Play size={24} className="text-white fill-white hover:scale-110 active:scale-95 transition-transform" />
          </div>
        </div>

        {/* Text descriptions and stats */}
        <div className="flex-grow flex flex-col justify-between self-stretch text-center md:text-left min-w-0" id="hero-banner-content">
          <div className="space-y-1.5">
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-400">
              <Sparkles size={13} style={{ color: theme.secondary }} />
              <span>CONTINUE STREAMING</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight truncate">
              {currentTrack?.title || 'No audio loaded'}
            </h1>
            <p className="text-sm font-semibold truncate text-[#00e5ff]" style={{ color: theme.secondary }}>
              {currentTrack?.artist || 'Import custom audio or directories inside the Library tab'} &bull; <span className="text-zinc-400 font-normal">{currentTrack?.album || 'Neonwave Default Feed'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 md:mt-0">
            <button
              onClick={onTogglePlay}
              className="px-5 py-2 rounded-full font-bold text-xs bg-white text-black hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              style={{ backgroundColor: theme.primary }}
            >
              <Play size={12} className="fill-black text-black" />
              <span>{isPlaying ? 'PAUSE SECTOR' : 'QUICK PLAY'}</span>
            </button>
            <span className="text-[11px] font-mono text-zinc-500 py-1 px-2.5 rounded-full bg-white/5 border border-white/5 truncate">
              DECIBEL STATUS: {isPlaying ? 'ANALYSING SPECTRUM' : 'STANDBY IDLE'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. RECENTLY PLAYED ROW */}
      {recentlyPlayed.length > 0 && (
        <div className="space-y-3" id="recently-played-shelf-wrap">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5">
              <TrendingUp size={14} style={{ color: theme.primary }} />
              <span>Recently Played</span>
            </h3>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar scroll-smooth snap-x select-none" id="recent-cards-deck">
            {recentlyPlayed.map((track) => {
              const isSynth = track.coverUrl === 'synthwave';
              return (
                <div 
                  key={track.id}
                  onClick={() => handlePlaySongById(track.id)}
                  className="snap-start w-36 flex-shrink-0 bg-zinc-900/40 hover:bg-zinc-800/40 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer group hover:shadow-lg relative"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center shadow-md mb-2">
                    {isSynth ? (
                      <div className="w-full h-full bg-linear-to-tr from-slate-900 to-indigo-950 flex items-center justify-center">
                        <Disc size={28} className="text-violet-500" />
                      </div>
                    ) : track.coverUrl ? (
                      <img src={track.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Music size={24} className="text-zinc-700" />
                    )}
                    
                    {/* Hover play reveal button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={16} className="text-white fill-white scale-90 group-hover:scale-100 transition-transform" />
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. GRID LAYOUT: ALBUMS GRID & CIRCULAR ARTISTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="home-bento-grid">
        
        {/* COLUMN 1 & 2: RECOGNIZED ALBUMS GRID */}
        <div className="xl:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wider text-zinc-350 uppercase">
              RESONANCE ALBUMS ({albums.length})
            </h3>
          </div>

          {albums.length === 0 ? (
            <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl p-8 text-center text-zinc-500 text-xs">
              No albums detected. Loaded tracks will automatically bundle under dynamic Album sets!
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" id="albums-grid-deck">
              {albums.slice(0, 6).map((album, idx) => {
                const isSynth = album.coverUrl === 'synthwave';
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectAlbum(album.name)}
                    className="cursor-pointer bg-zinc-900/30 hover:bg-zinc-800/40 border border-white/5 hover:border-white/10 rounded-xl p-3 flex flex-col gap-3 group transition-transform hover:-translate-y-1 duration-150"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center shadow-md">
                      {isSynth ? (
                        <div className="w-full h-full bg-linear-to-tr from-[#1a2333] to-[#080b0f] flex items-center justify-center">
                          <Disc size={30} style={{ color: theme.primary }} className="animate-spin-slow" />
                        </div>
                      ) : album.coverUrl ? (
                        <img src={album.coverUrl} alt={album.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Music size={26} className="text-zinc-650" />
                      )}

                      <div className="absolute top-2 right-2 duration-300 opacity-0 group-hover:opacity-100 bg-black/70 p-1.5 rounded-full border border-white/10">
                        <ArrowRight size={12} style={{ color: theme.secondary }} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-[#00e5ff] transition-colors">{album.name}</h4>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{album.artist} &bull; {album.trackIds.length} tracks</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 3: CIRCULAR INFLUENCING ARTISTS */}
        <div className="space-y-3.5 bg-zinc-900/20 border border-white/5 rounded-2xl p-4 flex flex-col">
          <h3 className="text-xs font-bold tracking-widest text-zinc-400 uppercase border-b border-zinc-800/60 pb-2">
            FEATURED CREATORS
          </h3>

          {artists.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-[11px] py-10">
              Empty catalogs
            </div>
          ) : (
            <div className="flex-grow flex flex-col gap-3.5 justify-center" id="featured-artists-deck">
              {artists.slice(0, 5).map((artist, idx) => {
                const isSynth = artist.name === 'NEONWAVE Engine';
                return (
                  <div
                    key={idx}
                    onClick={() => onSelectArtist(artist.name)}
                    className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-950 flex items-center justify-center shadow-lg border border-white/10">
                      {isSynth ? (
                        <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
                          <Radio size={15} className="text-white animate-pulse" />
                        </div>
                      ) : artist.avatarUrl ? (
                        <img src={artist.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Disc size={15} className="text-zinc-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-grow">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-white transition-colors">
                        {artist.name}
                      </h4>
                      <p className="text-[9.5px] text-zinc-500 font-mono uppercase">{artist.genre}</p>
                    </div>

                    <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full">
                      {artist.trackIds.length} EQ
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 4. DYNAMIC TRENDING / FAVORITES CAROUSEL */}
      {favorites.length > 0 && (
        <div className="space-y-3" id="favorites-horizon-wrap">
          <h3 className="text-sm font-bold tracking-wider text-zinc-350 uppercase flex items-center gap-1.5">
            <Heart size={14} className="text-red-500 fill-red-500 animate-pulse" />
            <span>Starred Favorites</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="liked-row-view">
            {favorites.slice(0, 4).map((track) => {
              const originalIdx = playlist.findIndex(t => t.id === track.id);
              const isLiked = isFavorited(track.id);
              return (
                <div
                  key={track.id}
                  onClick={() => handlePlaySongById(track.id)}
                  className="bg-zinc-950/60 hover:bg-zinc-900/60 rounded-xl p-3 border border-white/[0.03] hover:border-white/10 flex items-center gap-3 group cursor-pointer transition-colors"
                >
                  <div className="w-11 h-11 bg-zinc-900 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5 relative">
                    {track.coverUrl === 'synthwave' ? (
                      <div className="w-full h-full bg-linear-to-tr from-indigo-900 to-purple-950 flex items-center justify-center">
                        <Music size={14} className="text-zinc-400" />
                      </div>
                    ) : track.coverUrl ? (
                      <img src={track.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Music size={14} className="text-zinc-600" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={11} className="text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{track.title}</h4>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">{track.artist}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(track.id);
                    }}
                    className="p-1 px-2.5 rounded hover:bg-white/5 text-red-500 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <Heart size={13} className="fill-red-500 text-red-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
