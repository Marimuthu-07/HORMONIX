/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomPlayer } from './components/layout/BottomPlayer';
import { FullscreenPlayer } from './components/player/FullscreenPlayer';
import { useAppStore } from './store/useAppStore';
import { LibraryCommandCenter } from './components/library/LibraryCommandCenter';
import { Home } from './components/library/Home';
import { SongList } from './components/library/SongList';
import { AlbumGrid } from './components/library/AlbumGrid';
import { ArtistGrid } from './components/library/ArtistGrid';
import { PlaylistGrid } from './components/library/PlaylistGrid';
import { SearchView } from './components/library/Search';
import { SettingsView } from './components/library/Settings';
import { HistoryView } from './components/library/History';
import { QueuePanel } from './components/player/QueuePanel';
import { GlobalSearch } from './components/common/GlobalSearch';
import { useToastStore } from './components/common/Toast';
import { AnimatePresence, motion } from 'motion/react';
import { db } from './database/db';
import { Song } from './types';
import { 
  Music, 
  RefreshCw, 
  Home as HomeIcon, 
  Search, 
  Heart, 
  Settings, 
  X, 
  Disc, 
  Users, 
  History, 
  ListMusic 
} from 'lucide-react';
import { ActiveView } from './store/useAppStore';

export default function App() {
  const { activeView, setView, isDrawerOpen, setDrawerOpen } = useAppStore();
  const { toasts, dismissToast } = useToastStore();
  const [librarySongs, setLibrarySongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  // Load files on layout mount
  const loadLibrary = async () => {
    setLoading(true);
    try {
      const data = await db.getAllSongs();
      setLibrarySongs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, [activeView]);

  // Map active page/views
  const renderContentView = () => {
    switch (activeView) {
      case 'home':
        return <Home />;
      case 'library':
        return <LibraryCommandCenter songs={librarySongs} onSongDeleted={loadLibrary} />;
      case 'albums':
        return <AlbumGrid />;
      case 'artists':
        return <ArtistGrid />;
      case 'playlists':
        return <PlaylistGrid />;
      case 'favorites':
        return <SongList songs={librarySongs.filter((s) => s.favorite)} onSongDeleted={loadLibrary} />;
      case 'search':
        return <SearchView />;
      case 'queue':
        return <QueuePanel />;
      case 'settings':
        return <SettingsView />;
      case 'history':
        return <HistoryView />;
      default:
        return <Home />;
    }
  };

  const mobileNavItems = [
    { view: 'home' as ActiveView, label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
    { view: 'library' as ActiveView, label: 'Library', icon: <Music className="h-5 w-5" /> },
    { view: 'search' as ActiveView, label: 'Search', icon: <Search className="h-5 w-5" /> },
    { view: 'favorites' as ActiveView, label: 'Favorites', icon: <Heart className="h-5 w-5" /> },
    { view: 'settings' as ActiveView, label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const menuItems = [
    { view: 'home' as ActiveView, label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
    { view: 'library' as ActiveView, label: 'Library', icon: <Music className="h-5 w-5" /> },
    { view: 'albums' as ActiveView, label: 'Albums', icon: <Disc className="h-5 w-5" /> },
    { view: 'artists' as ActiveView, label: 'Artists', icon: <Users className="h-5 w-5" /> },
    { view: 'playlists' as ActiveView, label: 'Playlists', icon: <ListMusic className="h-5 w-5" /> },
    { view: 'favorites' as ActiveView, label: 'Favorites', icon: <Heart className="h-5 w-5" /> },
    { view: 'history' as ActiveView, label: 'History', icon: <History className="h-5 w-5" /> },
    { view: 'settings' as ActiveView, label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100 font-sans antialiased overflow-hidden select-none">
      {/* Sleek Titlebar */}
      <div className="hidden md:block flex-shrink-0">
        <TitleBar />
      </div>

      {/* Main split-view area */}
      <div className="flex flex-1 flex-row overflow-hidden relative">
        <div className="hidden md:flex h-full flex-shrink-0">
          <Sidebar />
        </div>

        {/* content panels */}
        <div className="flex flex-1 flex-col overflow-hidden bg-zinc-900/20">
          <TopBar />

          {/* Render container with elegant Framer Motion fade transitions */}
          <div className="flex-1 relative min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0 overflow-hidden"
              >
                {loading ? (
                  <div className="flex h-full items-center justify-center text-zinc-500 font-medium text-xs gap-3">
                    <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                    <span>Loading audio collections...</span>
                  </div>
                ) : (
                  renderContentView()
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Persistent Audio Media Player Deck */}
      <BottomPlayer />

      {/* Mobile Bottom Navigation Bar */}
      <div className="flex md:hidden h-16 w-full items-center justify-around border-t border-white/5 bg-zinc-950/90 backdrop-blur-xl px-4 pb-1 z-30">
        {mobileNavItems.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-150 ${
                isActive ? 'text-purple-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className={`transition-transform duration-150 ${isActive ? 'scale-110 text-purple-400' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile Menu Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Sidebar drawer panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex w-72 flex-col bg-zinc-950 p-5 border-r border-white/5 shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-lg shadow-purple-600/20">
                    <Music className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-black tracking-wider text-zinc-100 font-sans">
                    HORMONIX
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation items scrollable list */}
              <div className="flex flex-col gap-1.5 overflow-y-auto pr-1">
                {menuItems.map((item) => {
                  const isActive = activeView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        setView(item.view);
                        setDrawerOpen(false);
                      }}
                      className={`flex h-11 w-full items-center gap-4 rounded-xl px-3 text-left transition-all duration-150 ${
                        isActive 
                          ? 'text-purple-400 font-semibold bg-purple-500/10 border-l-2 border-purple-500' 
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                      }`}
                    >
                      <span className={isActive ? 'text-purple-400' : ''}>{item.icon}</span>
                      <span className="text-sm tracking-wide">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Immersive Now Playing Fullscreen Screen Overlay */}
      <FullscreenPlayer />

      {/* Pop-up Toast notification alerts */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => dismissToast(toast.id)}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md border text-xs font-semibold ${
                toast.type === 'error'
                  ? 'bg-red-950/80 border-red-500/20 text-red-200'
                  : 'bg-zinc-900/95 border-purple-500/20 text-zinc-200'
              }`}
            >
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Global Cmd+K / Ctrl+K Search Bar Launcher */}
      <GlobalSearch />
    </div>
  );
}
