import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Track, Theme, Folder, PlaybackState } from '../types';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX,
  Maximize2, ListMusic, Music, Disc, Activity, Sparkles, Heart, Bell, User, Clock,
  Home, Search, Library, Settings, ChevronLeft, ChevronRight, Menu, FolderHeart, Sliders, List,
  ChevronDown, ChevronUp, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Modular Sub-Panels
import HomePanel from './HomePanel';
import SearchPanel from './SearchPanel';
import LibraryPanel from './LibraryPanel';
import PlaylistPanel from './PlaylistPanel';
import SettingsPanel from './SettingsPanel';

// Fullscreen Flagship Visualizer
import FullscreenVisualizer from './FullscreenVisualizer';

interface SpotifyModeProps {
  playlist: Track[];
  currentTrackIndex: number;
  currentTrack: Track | null;
  playbackState: PlaybackState;
  activePlayer: 'A' | 'B';
  analyser: AnalyserNode | null;
  onSelectTrack: (index: number) => void;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onSetGaplessEnabled: (enabled: boolean) => void;
  onSetCrossfadeDuration: (duration: number) => void;
  themes: Theme[];
  activeTheme: Theme;
  onSelectTheme: (themeId: string) => void;
  onTogglePlaylist: () => void;
  onSwitchMode: () => void; // artwork mode trigger
  folders: Folder[];
  onCreateFolder: (name: string, parentId: string | null) => string;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveTrackToFolder: (trackId: string, destFolderId: string | null) => void;
  onAddFolderBatch?: (files: File[]) => void;
  onAddFiles?: (files: File[]) => void;
}

export interface PlaylistData {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  trackIds: string[];
}

export default function SpotifyMode({
  playlist,
  currentTrackIndex,
  currentTrack,
  playbackState,
  analyser,
  onSelectTrack,
  onTogglePlay,
  onPlayNext,
  onPlayPrev,
  onSeek,
  onSetVolume,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onSetGaplessEnabled,
  onSetCrossfadeDuration,
  themes,
  activeTheme,
  onSelectTheme,
  onTogglePlaylist,
  onSwitchMode,
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTrackToFolder,
  onAddFolderBatch,
  onAddFiles
}: SpotifyModeProps) {
  
  // Dashboard Sections Active View State
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'playlists' | 'settings'>('home');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [sidebarMobileVisible, setSidebarMobileVisible] = useState<boolean>(false);

  // States inside Local Cache
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState<string[]>([]);
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<string[]>([]);
  const [customPlaylists, setCustomPlaylists] = useState<PlaylistData[]>([]);
  const [userName, setUserName] = useState<string>('Audio Wanderer');

  // Fullscreen visualizer overlay triggered internally
  const [isFullscreenVisualizer, setIsFullscreenVisualizer] = useState<boolean>(false);
  const [isExpandedPlayerOpen, setIsExpandedPlayerOpen] = useState<boolean>(false);
  const [isHudPlaylistOpen, setIsHudPlaylistOpen] = useState<boolean>(false);
  const [hudSearchQuery, setHudSearchQuery] = useState<string>('');
  const [currentTimeUTC, setCurrentTimeUTC] = useState<string>('00:00:00 UTC');
  const [localSeekTime, setLocalSeekTime] = useState<number | null>(null);

  const handleSelectTrack = (index: number) => {
    onSelectTrack(index);
    setIsExpandedPlayerOpen(true);
  };

  // Load and subscribe to persistent states
  useEffect(() => {
    // 1. Load Username
    const savedName = localStorage.getItem('neonwave_username') || 'Audio Wanderer';
    setUserName(savedName);

    // 2. Load History
    const history = localStorage.getItem('neonwave_history');
    if (history) setRecentlyPlayedIds(JSON.parse(history));

    // 3. Load Starred Favorites
    const starred = localStorage.getItem('neonwave_favorites');
    if (starred) setFavoriteTrackIds(JSON.parse(starred));

    // 4. Load Custom Playlists (Seed initial default workspace if empty)
    const lists = localStorage.getItem('neonwave_custom_playlists');
    if (lists) {
      setCustomPlaylists(JSON.parse(lists));
    } else {
      const defaultPlaylist: PlaylistData = {
        id: 'p-1',
        name: 'Retro Space Cruise',
        description: 'Immersive soundscapes for neon-glow journeys',
        coverUrl: 'neon-violet',
        trackIds: playlist.slice(0, 2).map(t => t.id)
      };
      setCustomPlaylists([defaultPlaylist]);
      localStorage.setItem('neonwave_custom_playlists', JSON.stringify([defaultPlaylist]));
    }

    // Subscribe to username events
    const handleNameEvent = () => {
      setUserName(localStorage.getItem('neonwave_username') || 'Audio Wanderer');
    };
    window.addEventListener('username_updated', handleNameEvent);
    return () => window.removeEventListener('username_updated', handleNameEvent);
  }, [playlist]);

  // Update track history playing status
  useEffect(() => {
    if (currentTrack) {
      setRecentlyPlayedIds(prev => {
        const next = [currentTrack.id, ...prev.filter(id => id !== currentTrack.id)].slice(0, 10);
        localStorage.setItem('neonwave_history', JSON.stringify(next));
        return next;
      });
    }
  }, [currentTrack]);

  // Real-time UTC ticking formatted exactly
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      setCurrentTimeUTC(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mappings to actual objects
  const recentlyPlayedTracks = useMemo(() => {
    return recentlyPlayedIds
      .map(id => playlist.find(t => t.id === id))
      .filter((t): t is Track => !!t);
  }, [recentlyPlayedIds, playlist]);

  const favoriteTracks = useMemo(() => {
    return favoriteTrackIds
      .map(id => playlist.find(t => t.id === id))
      .filter((t): t is Track => !!t);
  }, [favoriteTrackIds, playlist]);

  // Favorite controller
  const isFavorited = (trackId: string) => favoriteTrackIds.includes(trackId);

  const handleToggleFavorite = (trackId: string) => {
    let next: string[] = [];
    if (favoriteTrackIds.includes(trackId)) {
      next = favoriteTrackIds.filter(id => id !== trackId);
    } else {
      next = [...favoriteTrackIds, trackId];
    }
    setFavoriteTrackIds(next);
    localStorage.setItem('neonwave_favorites', JSON.stringify(next));
  };

  // Playlists controllers
  const handleCreatePlaylist = (name: string, desc: string, cover: string) => {
    const newPlay: PlaylistData = {
      id: `p-${Date.now()}`,
      name,
      description: desc,
      coverUrl: cover,
      trackIds: []
    };
    const next = [...customPlaylists, newPlay];
    setCustomPlaylists(next);
    localStorage.setItem('neonwave_custom_playlists', JSON.stringify(next));
  };

  const handleUpdatePlaylistTracks = (playlistId: string, trackIds: string[]) => {
    const next = customPlaylists.map(p => p.id === playlistId ? { ...p, trackIds } : p);
    setCustomPlaylists(next);
    localStorage.setItem('neonwave_custom_playlists', JSON.stringify(next));
  };

  const handleDeletePlaylist = (playlistId: string) => {
    const next = customPlaylists.filter(p => p.id !== playlistId);
    setCustomPlaylists(next);
    localStorage.setItem('neonwave_custom_playlists', JSON.stringify(next));
  };

  // Handle seeking interaction
  const getProgressPercent = () => {
    if (!currentTrack || currentTrack.duration === 0) return 0;
    const time = localSeekTime !== null ? localSeekTime : playbackState.currentTime;
    return (time / currentTrack.duration) * 100;
  };

  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSeekTime(parseFloat(e.target.value));
  };

  const handleProgressBarEnd = () => {
    if (localSeekTime !== null) {
      onSeek(localSeekTime);
      setLocalSeekTime(null);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hexToRgb = (hex: string): string => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      return `${r}, ${g}, ${b}`;
    }
    const num = parseInt(cleanHex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
  };

  // Sub-navigation triggers for albums/artists details
  const handleSelectArtist = (artistName: string) => {
    // Shifting to search querying instantly
    setActiveTab('search');
    // Set query in input manually if target field exists
    const inputField = document.getElementById('global-search-query-field') as HTMLInputElement;
    if (inputField) {
      inputField.value = artistName;
      // Trigger native input change event to update state inside SearchPanel
      const ev = new Event('input', { bubbles: true });
      inputField.dispatchEvent(ev);
    }
  };

  const handleSelectAlbum = (albumName: string) => {
    setActiveTab('search');
    setTimeout(() => {
      const inputField = document.getElementById('global-search-query-field') as HTMLInputElement;
      if (inputField) {
        inputField.value = albumName;
        const ev = new Event('input', { bubbles: true });
        inputField.dispatchEvent(ev);
      }
    }, 20);
  };

  // Safe color codes from theme config
  const themeAccentColor = activeTheme.accent;
  const themePrimaryColor = activeTheme.primary;

  return (
    <div className="w-full h-screen bg-[#080B12] text-white flex flex-col overflow-hidden relative" id="neonwave-app-hud">
      
      {/* BACKGROUND GRAPH LEVEL DUST */}
      <div className="absolute inset-0 bg-[#080B12] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-950 via-[#080B12] to-zinc-950 pointer-events-none z-0" />

      {/* BODY SHELL: COLLAPSIBLE SIDEBAR + MAIN SCROLLING CONTENT WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* 1. COLLAPSIBLE NAV SIDEBAR */}
        <aside 
          className={`h-full flex flex-col border-r border-white/5 bg-[#111827]/75 backdrop-blur-xl transition-all duration-300 relative z-30 select-none ${
            sidebarExpanded ? 'w-64' : 'w-20'
          } ${
            sidebarMobileVisible ? 'fixed inset-y-0 left-0 w-64 shadow-[10px_0_30px_rgba(0,0,0,0.8)]' : 'hidden md:flex'
          }`}
          id="neonwave-aside-panel"
        >
          {/* Logo Brand Title */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between" id="aside-brand-title">
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-tr shadow-md animate-pulse shrink-0"
                style={{ backgroundImage: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.accent})` }}
              >
                <Activity size={15} className="text-white" />
              </div>
              {sidebarExpanded && (
                <div className="min-w-0">
                  <span className="text-xs font-black tracking-widest text-white uppercase font-sans">NEONWAVE</span>
                  <p className="text-[8.5px] text-zinc-500 font-mono mt-0.5">EST. VERSION 2026</p>
                </div>
              )}
            </div>

            {/* Desktop fold controller button */}
            <button 
              onClick={() => setSidebarExpanded(prev => !prev)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer outline-none"
              title="Toggle Sidebar Layout"
            >
              {sidebarExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          {/* Nav List links */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar" id="aside-scrolling-links">
            <span className="text-[8px] font-black text-zinc-650 tracking-widest block uppercase px-2 mb-1.5">{sidebarExpanded ? 'PROMENADE NAVIGATION' : 'NAV'}</span>
            {[
              { id: 'home', label: 'Home Sanctum', icon: Home, color: activeTheme.primary },
              { id: 'search', label: 'Search Scanner', icon: Search, color: activeTheme.secondary },
              { id: 'library', label: 'Directories Cabinet', icon: Library, color: activeTheme.accent },
              { id: 'playlists', label: 'Checklists Forge', icon: ListMusic, color: '#00C853' },
              { id: 'settings', label: 'Control Console', icon: Settings, color: '#FFC107' }
            ].map((tab) => {
              const active = activeTab === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSidebarMobileVisible(false);
                  }}
                  className={`w-full flex items-center gap-3 py-2.5 px-3.5 rounded-xl transition-all duration-150 group cursor-pointer text-left outline-none ${
                    active 
                      ? 'bg-white/10 text-white font-extrabold shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <IconComp 
                    size={16} 
                    className="transition-transform group-hover:scale-110" 
                    style={active ? { color: tab.color } : {}} 
                  />
                  {sidebarExpanded && (
                    <span className="text-[12.5px] truncate font-semibold uppercase tracking-wide">
                      {tab.label}
                    </span>
                  )}
                  {active && sidebarExpanded && (
                    <span className="w-1.5 h-1.5 rounded-full ml-auto" style={{ backgroundColor: tab.color }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User profile segment card inside aside footer */}
          <div className="p-3 border-t border-white/5 bg-zinc-950/40 select-none space-y-2.5 shrink-0" id="aside-profile-card">
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                onClick={() => setActiveTab('settings')}
                className="w-8 h-8 rounded-full outline-white/5 shadow cursor-pointer uppercase flex items-center justify-center font-bold text-white text-[11px] font-mono shrink-0"
                style={{ background: `linear-gradient(135deg, ${activeTheme.primary}, ${activeTheme.secondary})` }}
              >
                {userName.substring(0, 2).toUpperCase()}
              </div>
              {sidebarExpanded && (
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-extrabold text-[#e4e4e7] truncate cursor-pointer" onClick={() => setActiveTab('settings')}>
                    {userName}
                  </h5>
                  <p className="text-[9px] text-[#00e5ff] font-bold font-mono uppercase tracking-wider truncate">Offline Stream</p>
                </div>
              )}
            </div>

            {/* Change artwork mode quick pill */}
            {sidebarExpanded && (
              <button
                onClick={onSwitchMode}
                className="w-full text-center py-1 rounded bg-[#00e5ff]/5 hover:bg-[#00e5ff]/10 border border-[#00e5ff]/10 text-[#00e5ff] text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all duration-155 cursor-pointer"
              >
                <Disc size={11} className="animate-spin-slow" />
                <span>Classic Jukebox HUD</span>
              </button>
            )}
          </div>
        </aside>

        {/* mobile background backdrop overlay */}
        {sidebarMobileVisible && (
          <div 
            onClick={() => setSidebarMobileVisible(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-20 md:hidden"
          />
        )}

        {/* 2. RIGHT SCROLLING MAIN CONTAINER */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative" id="neonwave-workspace-shield">
          
          {/* A. STICKY DYNAMIC NAV HEADER BANNER */}
          <header className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-[#080B12]/85 backdrop-blur-md select-none relative z-10 shrink-0 select-none">
            <div className="flex items-center gap-3">
              {/* Mobile side menu trigger button */}
              <button
                onClick={() => setSidebarMobileVisible(prev => !prev)}
                className="md:hidden p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer outline-none"
              >
                <Menu size={16} />
              </button>

              {/* History navigators back/forward mock buttons */}
              <div className="hidden sm:flex items-center gap-1.5 select-none">
                <button 
                  onClick={() => setActiveTab('home')}
                  className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-[#111827] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer outline-none"
                  title="Shift to Home Sanctum"
                >
                  <ChevronLeft size={14} />
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-8 h-8 rounded-lg bg-[#111827]/60 hover:bg-[#111827] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer outline-none"
                  title="Shift to Settings Console"
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Page Section title heading */}
              <div className="flex flex-col select-none pl-1 justify-center">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff] uppercase">
                  {activeTab === 'home' && 'HOME SECTOR'}
                  {activeTab === 'search' && 'EXPLORATION INDEXED'}
                  {activeTab === 'library' && 'FILE REPOSITORY'}
                  {activeTab === 'playlists' && 'COMPILATIONS LISTS'}
                  {activeTab === 'settings' && 'SYSTEM VARIABLES'}
                </span>
              </div>
            </div>

            {/* System Notifications / Info widget bar */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-1 bg-black/40 border border-white/5 px-3 py-1 rounded-full font-mono text-[10px] text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>OFFLINE SECURE STATUS: CORE ACTIVE</span>
              </div>

              {/* Notifications bell dropdown mock */}
              <button 
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all relative cursor-pointer outline-none"
                onClick={() => alert('All modules synced perfectly offline on this container! zero internet needed.')}
              >
                <Bell size={13} />
                <span className="absolute top-2.5 right-2.5 w-1.5 a h-1.5 rounded-full bg-[#ff4d9d]" style={{ backgroundColor: activeTheme.accent }} />
              </button>
            </div>
          </header>

          {/* B. SCROLLING APP SHEET CONTENT CAROUSEL */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6" id="main-content-scroll">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'home' && (
                  <HomePanel
                    playlist={playlist}
                    currentTrack={currentTrack}
                    isPlaying={playbackState.isPlaying}
                    onSelectTrack={handleSelectTrack}
                    onTogglePlay={onTogglePlay}
                    theme={activeTheme}
                    recentlyPlayed={recentlyPlayedTracks}
                    favorites={favoriteTracks}
                    onSelectArtist={handleSelectArtist}
                    onSelectAlbum={handleSelectAlbum}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorited={isFavorited}
                  />
                )}

                {activeTab === 'search' && (
                  <SearchPanel
                    playlist={playlist}
                    onSelectTrack={handleSelectTrack}
                    theme={activeTheme}
                    onSelectArtist={handleSelectArtist}
                    onSelectAlbum={handleSelectAlbum}
                  />
                )}

                {activeTab === 'library' && (
                  <LibraryPanel
                    playlist={playlist}
                    currentTrackIndex={currentTrackIndex}
                    onSelectTrack={handleSelectTrack}
                    removeTrack={() => {}}
                    theme={activeTheme}
                    folders={folders}
                    onCreateFolder={onCreateFolder}
                    onRenameFolder={onRenameFolder}
                    onDeleteFolder={onDeleteFolder}
                    onMoveTrackToFolder={onMoveTrackToFolder}
                    onAddFolderBatch={onAddFolderBatch}
                    onAddFiles={onAddFiles}
                  />
                )}

                {activeTab === 'playlists' && (
                  <PlaylistPanel
                    playlist={playlist}
                    currentTrackIndex={currentTrackIndex}
                    onSelectTrack={handleSelectTrack}
                    theme={activeTheme}
                    customPlaylists={customPlaylists}
                    onCreatePlaylist={handleCreatePlaylist}
                    onUpdatePlaylistTracks={handleUpdatePlaylistTracks}
                    onDeletePlaylist={handleDeletePlaylist}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsPanel
                    themes={themes}
                    activeTheme={activeTheme}
                    onSelectTheme={onSelectTheme}
                    gaplessEnabled={true} // Hardwired backend triggers
                    onSetGaplessEnabled={onSetGaplessEnabled}
                    crossfadeDuration={playbackState.crossfadeDuration}
                    onSetCrossfadeDuration={onSetCrossfadeDuration}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* 3. GLASSMORPHIC BOTTOM PLAYBARFOOTER CARD PANEL */}
      <footer 
        className="h-24 px-4 sm:px-6 bg-[#111827]/90 backdrop-blur-2xl border-t border-white/5 flex items-center justify-between select-none relative z-40 select-none"
        id="neonwave-playbar-strip"
      >
        {/* Seek percentage slider tracker - absolute top edge of footer */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-950 flex items-center group">
          <input
            type="range"
            min="0"
            max={currentTrack?.duration || 100}
            step="0.1"
            value={localSeekTime !== null ? localSeekTime : playbackState.currentTime}
            onChange={handleProgressBarChange}
            onMouseUp={handleProgressBarEnd}
            onTouchEnd={handleProgressBarEnd}
            className="w-full absolute inset-y-0 h-1 appearance-none bg-transparent cursor-pointer outline-none focus:outline-none select-none z-10"
            style={{ accentColor: activeTheme.primary }}
          />
          {/* Custom visible tracking bar line with theme accent color */}
          <div 
            className="h-full pointer-events-none transition-all duration-75 relative"
            style={{ 
              width: `${getProgressPercent()}%`, 
              background: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.secondary})` 
            }}
          >
            <span 
              className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow-md transition-opacity"
              style={{ backgroundColor: activeTheme.primary }}
            />
          </div>
        </div>

        {/* LEFT COLUMN: NOW PLAYING THUMBNAIL META DETAILS */}
        <div 
          onClick={() => setIsExpandedPlayerOpen(true)}
          className="flex items-center gap-3 w-1/4 min-w-[130px] cursor-pointer group/footer-meta" 
          id="playbar-metadata-segment"
        >
          <div className="relative w-12 h-12 bg-zinc-950 border border-white/5 rounded-xl overflow-hidden shadow-md flex items-center justify-center shrink-0 group">
            {currentTrack?.coverUrl === 'synthwave' ? (
              <div className="w-full h-full bg-linear-to-tr from-slate-900 to-zinc-950 flex items-center justify-center">
                <Disc size={18} className="text-[#00e5ff] animate-spin-slow" />
              </div>
            ) : currentTrack?.coverUrl ? (
              <img src={currentTrack.coverUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : (
              <Music size={15} className="text-zinc-750 animate-pulse" />
            )}
            
            {/* Quick maximized visual overlay trigger button */}
            <div 
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
            >
              <ChevronUp size={14} className="animate-bounce" />
            </div>
          </div>

          <div className="hidden sm:block min-w-0">
            <h4 
              className="text-xs font-black text-white group-hover/footer-meta:text-[#00e5ff] uppercase truncate tracking-tight transition-colors"
            >
              {currentTrack?.title || 'Standalone Idle'}
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">{currentTrack?.artist || 'Import folder inside Library'}</span>
              <ChevronUp size={10} className="text-zinc-500 hover:text-[#00e5ff] animate-pulse" />
            </div>
          </div>

          {/* Favorite button toggle */}
          {currentTrack && (
            <button
              onClick={() => handleToggleFavorite(currentTrack.id)}
              className="p-1 rounded bg-zinc-950/20 hover:bg-white/5 text-zinc-550 transition-colors ml-1 shrink-0 cursor-pointer"
            >
              <Heart 
                size={13} 
                className={isFavorited(currentTrack.id) ? "fill-red-500 text-red-500" : "text-zinc-500"} 
              />
            </button>
          )}
        </div>

        {/* CENTER COLUMN: INTERACTIVE CORE PLAYBAR MEDIA RACK */}
        <div className="flex flex-col items-center gap-2 justify-center" id="playbar-mid-racks">
          <div className="flex items-center gap-4 sm:gap-6 text-zinc-500">
            {/* Shuffle button */}
            <button
              onClick={onToggleShuffle}
              className={`p-1 hover:text-white hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer ${
                playbackState.isShuffle ? 'text-[#00e5ff]' : ''
              }`}
              style={playbackState.isShuffle ? { color: activeTheme.secondary } : {}}
              title="Toggle Shuffle Tracks"
            >
              <Shuffle size={14} className={playbackState.isShuffle ? "animate-pulse" : ""} />
            </button>

            {/* Prev button */}
            <button
              onClick={onPlayPrev}
              className="p-1 hover:text-white hover:scale-105 active:scale-90 transition-all outline-none cursor-pointer"
              title="Previous Song"
            >
              <SkipBack size={15} />
            </button>

            {/* Primary Toggle play/pause circular bubble button */}
            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-zinc-950 hover:scale-[1.08] active:scale-90 transition-all shadow-md focus:outline-none cursor-pointer"
              style={{ backgroundColor: activeTheme.primary }}
              title="Quick Toggle Play"
            >
              {playbackState.isPlaying ? (
                <Pause size={15} className="fill-black text-black" />
              ) : (
                <Play size={15} className="fill-black text-black translate-x-0.5" />
              )}
            </button>

            {/* Next button */}
            <button
              onClick={onPlayNext}
              className="p-1 hover:text-white hover:scale-105 active:scale-90 transition-all outline-none cursor-pointer"
              title="Next Song"
            >
              <SkipForward size={15} />
            </button>

            {/* Repeat button */}
            <button
              onClick={onToggleRepeat}
              className={`p-1 hover:text-white hover:scale-105 active:scale-95 transition-all outline-none cursor-pointer ${
                playbackState.isRepeat !== 'none' ? 'text-[#ff4d9d]' : ''
              }`}
              style={playbackState.isRepeat !== 'none' ? { color: activeTheme.accent } : {}}
              title="Toggle Track Repeat Mode"
            >
              <Repeat size={14} />
            </button>
          </div>

          {/* Time text indicator under the buttons of playbar */}
          <div className="hidden md:flex items-center justify-between text-[10px] text-zinc-550 font-mono w-44 select-none">
            <span>{formatTime(playbackState.currentTime)}</span>
            <span>&bull;</span>
            <span>{formatTime(currentTrack?.duration || 0)}</span>
          </div>
        </div>

        {/* RIGHT COLUMN: DECIBELS VOLUMES + FLAGS OVERLAYS CONTROLLERS */}
        <div className="flex items-center gap-3 w-1/4 justify-end min-w-[120px]" id="playbar-volume-segment">
          
          {/* Mute toggle */}
          <button
            onClick={onToggleMute}
            className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-white transition-colors cursor-pointer outline-none"
            title="Mute Volume"
          >
            {playbackState.isMuted ? (
              <VolumeX size={15} className="text-rose-500 animate-pulse" />
            ) : (
              <Volume2 size={15} />
            )}
          </button>

          {/* Volume slider */}
          <div className="relative w-16 sm:w-20 h-1 bg-zinc-800 rounded group cursor-pointer flex items-center select-none" id="volume-wrapper">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playbackState.isMuted ? 0 : playbackState.volume}
              onChange={(e) => onSetVolume(parseFloat(e.target.value))}
              className="w-full absolute inset-y-0 h-1 appearance-none bg-transparent cursor-pointer outline-none focus:outline-none select-none z-10"
              style={{ accentColor: activeTheme.secondary }}
            />
            {/* Custom filled indicator line */}
            <div 
              className="h-full pointer-events-none transition-all relative"
              style={{
                width: `${playbackState.isMuted ? 0 : playbackState.volume * 100}%`,
                backgroundColor: activeTheme.secondary
              }}
            />
          </div>

          <div className="w-px h-4 bg-white/5 mx-2" />

          {/* Fullscreen visualizer button */}
          <button
            onClick={() => setIsFullscreenVisualizer(true)}
            className="p-2 rounded-xl bg-zinc-950/40 hover:bg-white/5 text-zinc-400 hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer outline-none flex items-center gap-1.5 border border-white/5 font-mono text-[9.5px] font-bold"
            title="Immersive Master Visualizer"
          >
            <Maximize2 size={12} className="text-[#00e5ff]" style={{ color: activeTheme.secondary }} />
            <span className="hidden lg:inline uppercase">CINEMATIC</span>
          </button>
        </div>

      </footer>

      {/* 4. IMMERSIVE CINEMATIC OVERLAYS MODALS */}
      <AnimatePresence>
        {isFullscreenVisualizer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 overflow-hidden bg-black"
          >
            <FullscreenVisualizer
              currentTrack={currentTrack}
              playbackState={playbackState}
              analyser={analyser}
              onTogglePlay={onTogglePlay}
              onPlayNext={onPlayNext}
              onPlayPrev={onPlayPrev}
              onSeek={onSeek}
              onSetVolume={onSetVolume}
              onToggleMute={onToggleMute}
              theme={activeTheme}
              onClose={() => setIsFullscreenVisualizer(false)}
              isFavorited={currentTrack ? isFavorited(currentTrack.id) : false}
              onToggleFavorite={() => currentTrack && handleToggleFavorite(currentTrack.id)}
              playlist={playlist}
              onSelectTrack={onSelectTrack}
            />
          </motion.div>
        )}

        {/* PLAYBACK HUD EXPANSION MODAL OVERLAY (THE ATTACHED IMAGE) */}
        {isExpandedPlayerOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/98 backdrop-blur-3xl flex flex-col pointer-events-auto"
            id="mobile-hud-expanded-overlay"
          >
            {/* Blurred ambient album artwork background just like the mock-up */}
            <div className="absolute inset-0 z-0 opacity-25 overflow-hidden pointer-events-none select-none">
              {currentTrack?.coverUrl && currentTrack.coverUrl !== 'synthwave' ? (
                <img 
                  src={currentTrack.coverUrl} 
                  className="w-full h-full object-cover scale-150 blur-3xl saturate-200" 
                  alt="" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="w-full h-full blur-3xl" 
                  style={{
                    background: `radial-gradient(circle at center, rgb(${hexToRgb(activeTheme.primary)}), rgb(${hexToRgb(activeTheme.secondary)}), transparent)`
                  }}
                />
              )}
            </div>

            {/* 1. TOP HEADER NAVIGATION DECK */}
            <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-md">
              <button 
                onClick={() => setIsExpandedPlayerOpen(false)}
                className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer outline-none border border-white/5"
                title="Minimize HUD player"
              >
                <ChevronDown size={19} />
              </button>

              <div className="text-center select-none">
                <div className="text-[9px] sm:text-[10px] tracking-[0.2em] font-black text-zinc-400 uppercase">PLAYING FROM SELECTION</div>
                <div className="text-xs font-bold text-zinc-200 mt-0.5 truncate max-w-[180px] sm:max-w-xs">{currentTrack?.artist || 'Import Selection'}</div>
              </div>

              <button 
                className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer outline-none border border-white/5"
              >
                <MoreVertical size={19} />
              </button>
            </header>

            {/* 2. BODY CONTENT: SPLIT BENTO GRID (LHS ARTWORK, RHS DETAILS & CONTROLS) */}
            <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-6 py-6 md:py-12 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 overflow-y-auto custom-scrollbar">
              
              {/* LEFT LHS PANEL: HUGE CORE ALBUM ARTWORK */}
              <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] flex-shrink-0 relative group rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] border border-white/10 bg-zinc-900/60 flex items-center justify-center">
                {currentTrack?.coverUrl === 'synthwave' ? (
                  <div className="w-full h-full bg-linear-to-tr from-zinc-950 via-slate-900 to-zinc-950 flex flex-col items-center justify-center gap-3">
                    <Disc size={90} className="text-[#00e5ff] animate-spin-slow" style={{ color: activeTheme.primary }} />
                    <span className="text-xs font-mono font-bold tracking-widest text-[#00e5ff]/60 animate-pulse">SYNTH LABS</span>
                  </div>
                ) : currentTrack?.coverUrl ? (
                  <img 
                    src={currentTrack.coverUrl} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt="Album Art" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Music size={60} className="text-zinc-650 animate-pulse" />
                )}
                {/* Visual ripple pulse radiating behind cover */}
                <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-black/50 via-transparent to-transparent opacity-60" />
              </div>

              {/* RIGHT RHS PANEL: DETAILED METADATA + IMMERSIVE WAVE CONTROLLER PILLS */}
              <div className="flex-1 w-full flex flex-col gap-6 md:gap-8 justify-center">
                
                {/* Title & Artist Detail row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight truncate leading-tight">
                      {currentTrack?.title || 'Standalone Idle'}
                    </h2>
                    <p className="text-sm font-semibold text-zinc-400 mt-1 truncate">
                      {currentTrack?.artist || 'Unknown Artist'}
                    </p>
                  </div>

                  {currentTrack && (
                    <button
                      onClick={() => handleToggleFavorite(currentTrack.id)}
                      className="p-3.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all transform hover:scale-110 active:scale-90 cursor-pointer outline-none border border-white/5 shrink-0"
                    >
                      <Heart 
                        size={19} 
                        className={isFavorited(currentTrack.id) ? "fill-red-500 text-red-500 scale-110" : "text-zinc-350"} 
                      />
                    </button>
                  )}
                </div>

                {/* Progress bar timeline with seek sliders */}
                <div className="w-full flex flex-col gap-2">
                  <div className="relative w-full h-2 bg-white/10 rounded-full group cursor-pointer flex items-center select-none">
                    <input
                      type="range"
                      min="0"
                      max={currentTrack?.duration || 100}
                      step="0.1"
                      value={localSeekTime !== null ? localSeekTime : playbackState.currentTime}
                      onChange={handleProgressBarChange}
                      onMouseUp={handleProgressBarEnd}
                      onTouchEnd={handleProgressBarEnd}
                      className="w-full absolute inset-y-0 h-2 appearance-none bg-transparent cursor-pointer outline-none focus:outline-none select-none z-10"
                      style={{ accentColor: activeTheme.primary }}
                    />
                    {/* Visual colored elapsed line */}
                    <div 
                      className="h-full pointer-events-none rounded-full transition-all duration-75 relative bg-linear-to-r"
                      style={{ 
                        width: `${getProgressPercent()}%`, 
                        backgroundImage: `linear-gradient(90deg, ${activeTheme.primary}, ${activeTheme.secondary})` 
                      }}
                    >
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-xl flex items-center justify-center transform scale-110" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400 tracking-wider">
                    <span>{formatTime(playbackState.currentTime)}</span>
                    <span>{formatTime(currentTrack?.duration || 0)}</span>
                  </div>
                </div>

                {/* Main Audio deck controller row */}
                <div className="flex items-center justify-center sm:justify-between gap-4 py-2">
                  
                  {/* Shuffle button */}
                  <button
                    onClick={onToggleShuffle}
                    className={`p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer outline-none flex items-center justify-center transform hover:scale-105 active:scale-95 ${
                      playbackState.isShuffle ? 'text-[#00e5ff] border border-[#00e5ff]/20' : 'text-zinc-400 border border-white/5'
                    }`}
                    style={playbackState.isShuffle ? { color: activeTheme.secondary } : {}}
                    title="Toggle Shuffle"
                  >
                    <Shuffle size={17} />
                  </button>

                  <div className="flex items-center gap-5 sm:gap-7">
                    {/* Prev Track button */}
                    <button
                      onClick={onPlayPrev}
                      className="p-3 sm:p-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-all transform hover:scale-110 active:scale-90 cursor-pointer outline-none"
                    >
                      <SkipBack size={19} />
                    </button>

                    {/* Grand Central Play pause bubble */}
                    <button
                      onClick={onTogglePlay}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-white text-zinc-950 hover:scale-[1.08] active:scale-90 transition-all shadow-2xl focus:outline-none cursor-pointer border border-white/20"
                      style={{ backgroundColor: activeTheme.primary }}
                    >
                      {playbackState.isPlaying ? (
                        <Pause size={22} className="fill-black text-black" />
                      ) : (
                        <Play size={22} className="fill-black text-black translate-x-0.5" />
                      )}
                    </button>

                    {/* Next Track button */}
                    <button
                      onClick={onPlayNext}
                      className="p-3 sm:p-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white transition-all transform hover:scale-110 active:scale-90 cursor-pointer outline-none"
                    >
                      <SkipForward size={19} />
                    </button>
                  </div>

                  {/* Repeat button */}
                  <button
                    onClick={onToggleRepeat}
                    className={`p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer outline-none flex items-center justify-center transform hover:scale-105 active:scale-95 ${
                      playbackState.isRepeat !== 'none' ? 'text-[#ff4d9d] border border-[#ff4d9d]/20' : 'text-zinc-400 border border-white/5'
                    }`}
                    style={playbackState.isRepeat !== 'none' ? { color: activeTheme.accent } : {}}
                    title="Toggle Repeat"
                  >
                    <Repeat size={17} />
                  </button>

                </div>

                {/* THE MODE CONTROLLER CHANGER / VIEW SELECTOR PILLS ACCORDING TO USER REQ POINT 3 */}
                <div className="mt-4 p-4 rounded-2xl bg-zinc-900/40 border border-white/5 flex flex-col gap-3">
                  <span className="text-[10px] font-bold tracking-widest text-[#00e5ff] uppercase flex items-center gap-1.5 leading-none">
                    <Activity size={12} className="animate-pulse" />
                    <span>Change Layout Mode</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3 mt-1.5">
                    
                    {/* OPTION 1: IMMERSIVE CINEMATIC FULLSCREEN VISUALIZER */}
                    <button
                      onClick={() => {
                        setIsExpandedPlayerOpen(false); // close expanded
                        setIsFullscreenVisualizer(true); // open canvas visualizer modal
                      }}
                      className="cursor-pointer py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-mono text-[10px] font-bold tracking-wider uppercase flex flex-col items-center justify-center gap-1.5 text-center border border-[#00e5ff]/20 hover:shadow-lg hover:shadow-indigo-600/20 active:scale-[0.98] transition-all"
                    >
                      <Maximize2 size={13} className="text-[#00e5ff]" />
                      <span>Full Screen Mode</span>
                    </button>

                    {/* OPTION 2: CLASSIC JUKEBOX HUD PLAYER SCREEN */}
                    <button
                      onClick={() => {
                        setIsExpandedPlayerOpen(false); // close expanded 
                        onSwitchMode(); // Go back & switch Entire Applets playerMode to ArtworkMode/Jukebox HUD!
                      }}
                      className="cursor-pointer py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/10 text-zinc-300 hover:text-white font-mono text-[10px] font-bold tracking-wider uppercase flex flex-col items-center justify-center gap-1.5 text-center border border-white/5 active:scale-[0.98] transition-all"
                    >
                      <Disc size={13} className="text-[#ff4d9d] animate-spin-slow" />
                      <span>Jukebox HUD</span>
                    </button>

                  </div>
                </div>

              </div>

            </main>

            {/* UPWARD CHEVRON DRAWER INDICATOR / PLAYLIST TRIGGER AREA */}
            <footer 
              onClick={() => setIsHudPlaylistOpen(true)}
              className="relative z-10 w-full py-4.5 bg-black/35 hover:bg-black/45 border-t border-white/5 flex flex-col items-center justify-center gap-1.5 text-zinc-400 hover:text-[#00e5ff] cursor-pointer select-none transition-all"
            >
              <ChevronUp size={16} className="animate-bounce text-[#00e5ff]" />
              <div className="text-[10px] font-black tracking-[0.18em] uppercase">SWIPE UP OR CLICK TO VIEW PLAYLIST QUEUE</div>
            </footer>

            {/* PLAYLIST DRAWERS - SLIDING UP PANEL */}
            <AnimatePresence>
              {isHudPlaylistOpen && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                  className="absolute inset-x-0 bottom-0 top-[18%] z-50 bg-zinc-950/98 backdrop-blur-3xl border-t border-white/10 rounded-t-[32px] flex flex-col overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.85)]"
                  id="hud-playlist-slider-drawer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Top Drag Indicators */}
                  <div 
                    onClick={() => setIsHudPlaylistOpen(false)}
                    className="w-full py-4 flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <div className="w-12 h-1 bg-white/25 rounded-full group-hover:bg-[#00e5ff]/60 transition-colors" />
                    <span className="text-[9px] font-bold tracking-widest text-[#00e5ff] uppercase mt-1.5 group-hover:text-white transition-colors flex items-center gap-1">
                      <ChevronDown size={11} className="animate-pulse" />
                      Minimize Playlist Deck
                    </span>
                  </div>

                  {/* Search box & header */}
                  <div className="px-6 pb-4 border-b border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListMusic className="text-[#00e5ff]" size={16} />
                        <h3 className="text-xs font-black tracking-widest uppercase text-white">Interactive Playlist Queue</h3>
                      </div>
                      <span className="font-mono text-[9px] text-[#ff4d9d] bg-[#ff4d9d]/5 py-0.5 px-2.5 rounded-full border border-[#ff4d9d]/15">
                        {playlist.length} Tracks
                      </span>
                    </div>

                    <div className="relative w-full flex items-center">
                      <Search size={14} className="absolute left-3.5 text-zinc-500" />
                      <input 
                        type="text"
                        placeholder="Filter queue by title, artist, or tag..."
                        value={hudSearchQuery}
                        onChange={(e) => setHudSearchQuery(e.target.value)}
                        className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-white/5 focus:bg-white/10 border border-white/5 focus:border-[#00e5ff]/30 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Interactive Queue Scroll Track list */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 flex flex-col gap-2 bg-black/20">
                    {playlist.filter(t => 
                      t.title.toLowerCase().includes(hudSearchQuery.toLowerCase()) ||
                      t.artist.toLowerCase().includes(hudSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                        <Music className="text-zinc-700 animate-pulse" size={32} />
                        <span className="text-xs text-zinc-500 uppercase tracking-widest font-mono">No matching records found</span>
                      </div>
                    ) : (
                      playlist
                        .map((track, originalIndex) => ({ track, originalIndex }))
                        .filter(({ track }) => 
                          track.title.toLowerCase().includes(hudSearchQuery.toLowerCase()) ||
                          track.artist.toLowerCase().includes(hudSearchQuery.toLowerCase())
                        )
                        .map(({ track, originalIndex }) => {
                          const isActive = currentTrack?.id === track.id;
                          const isSynth = track.coverUrl === 'synthwave';
                          return (
                            <div
                              key={track.id || originalIndex}
                              onClick={() => {
                                onSelectTrack(originalIndex);
                              }}
                              className={`group/hud-item cursor-pointer w-full p-2.5 rounded-2xl flex items-center justify-between transition-all outline-none border ${
                                isActive 
                                  ? 'bg-gradient-to-r from-cyan-600/15 to-blue-600/15 border-[#00e5ff]/35 text-white shadow-[0_0_20px_rgba(0,229,255,0.08)]' 
                                  : 'bg-white/3 hover:bg-white/8 text-zinc-300 hover:text-white border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-4 overflow-hidden">
                                {/* Equalizer animate or indicator index */}
                                <div className="w-6 text-center text-[10px] font-mono font-bold text-zinc-500 shrink-0">
                                  {isActive && playbackState.isPlaying ? (
                                    <div className="flex items-end justify-center gap-[2.5px] h-3.5 w-full pb-[1px]">
                                      <span className="w-0.5 bg-[#00e5ff] rounded-full animate-equalizer-bar-1" style={{ height: '70%', transformOrigin: 'bottom' }} />
                                      <span className="w-0.5 bg-[#00e5ff] rounded-full animate-equalizer-bar-2" style={{ height: '100%', transformOrigin: 'bottom' }} />
                                      <span className="w-0.5 bg-[#00e5ff] rounded-full animate-equalizer-bar-3" style={{ height: '50%', transformOrigin: 'bottom' }} />
                                    </div>
                                  ) : (
                                    <span>{originalIndex + 1}</span>
                                  )}
                                </div>

                                {/* Thumbnail cover */}
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-white/5 relative">
                                  {isSynth ? (
                                    <div className="w-full h-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center">
                                      <Music size={14} className="text-white" />
                                    </div>
                                  ) : track.coverUrl ? (
                                    <img 
                                      src={track.coverUrl} 
                                      alt="" 
                                      className="w-full h-full object-cover" 
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                      <Music size={14} className="text-zinc-650" />
                                    </div>
                                  )}
                                </div>

                                {/* Meta details text */}
                                <div className="flex flex-col text-left overflow-hidden">
                                  <span className={`text-[12px] font-bold truncate tracking-tight uppercase ${isActive ? 'text-[#00e5ff]' : 'text-zinc-100'}`}>
                                    {track.title}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium truncate">
                                    {track.artist}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 pr-1 shrink-0">
                                <span className="font-mono text-[10px] text-zinc-500 group-hover/hud-item:text-zinc-350">
                                  {track.duration || '0:00'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
