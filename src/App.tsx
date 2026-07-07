import { useState } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { PresetThemes } from './utils/themes';
import SpotifyMode from './components/SpotifyMode';
import ArtworkMode from './components/ArtworkMode';
import Playlist from './components/Playlist';
import { PlayerMode } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

export default function App() {
  const {
    playlist,
    currentTrackIndex,
    currentTrack,
    playbackState,
    activePlayer,
    analyser,
    playTrackIndex,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    setGaplessEnabled,
    setCrossfadeDuration,
    handleAddNewTrack,
    handleImportFolderBatch,
    removeTrack,
    notification,
    clearNotification,
    folders,
    createFolder,
    renameFolder,
    deleteFolder,
    moveTrackToFolder
  } = useAudioEngine();

  const [playerMode, setPlayerMode] = useState<PlayerMode>('spotify');
  const [activeThemeId, setActiveThemeId] = useState<string>('cyber-neon');
  const [isPlaylistVisible, setIsPlaylistVisible] = useState<boolean>(false);

  // Match current active theme config
  const activeTheme = PresetThemes.find(t => t.id === activeThemeId) || PresetThemes[0];

  const handleSelectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
  };

  const handleTogglePlaylist = () => {
    setIsPlaylistVisible(prev => !prev);
  };

  const handleSwitchMode = () => {
    setPlayerMode(prev => (prev === 'spotify' ? 'artwork' : 'spotify'));
  };

  const handleAddFilesBatch = async (files: File[]) => {
    for (const file of files) {
      await handleAddNewTrack(file);
    }
  };

  return (
    <div 
      className={`relative w-screen h-screen overflow-hidden flex flex-col bg-linear-to-b text-zinc-100 font-sans tracking-tight ${activeTheme.bg}`}
      id="neonwave-applet-root"
    >
      {/* 1. LAYOUT CONTROLLER */}
      <div className="flex-1 pb-20 w-full h-full relative" id="layout-stack-box">
        {playerMode === 'spotify' ? (
          <SpotifyMode
            playlist={playlist}
            currentTrackIndex={currentTrackIndex}
            currentTrack={currentTrack}
            playbackState={playbackState}
            activePlayer={activePlayer}
            analyser={analyser}
            onSelectTrack={playTrackIndex}
            onTogglePlay={togglePlay}
            onPlayNext={playNext}
            onPlayPrev={playPrev}
            onSeek={seek}
            onSetVolume={setVolume}
            onToggleMute={toggleMute}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            onSetGaplessEnabled={setGaplessEnabled}
            onSetCrossfadeDuration={setCrossfadeDuration}
            themes={PresetThemes}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onTogglePlaylist={handleTogglePlaylist}
            onSwitchMode={handleSwitchMode}
            folders={folders}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveTrackToFolder={moveTrackToFolder}
            onAddFolderBatch={handleImportFolderBatch}
            onAddFiles={handleAddFilesBatch}
          />
        ) : (
          <ArtworkMode
            currentTrack={currentTrack}
            playbackState={playbackState}
            analyser={analyser}
            onTogglePlay={togglePlay}
            onPlayNext={playNext}
            onPlayPrev={playPrev}
            onSeek={seek}
            onSetVolume={setVolume}
            onToggleMute={toggleMute}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
            activeTheme={activeTheme}
            onTogglePlaylist={handleTogglePlaylist}
            onSwitchMode={handleSwitchMode}
          />
        )}
      </div>

      {/* 2. SLIDE OUT NESTED LIBRARY DRAWER */}
      <Playlist
        playlist={playlist}
        currentTrackIndex={currentTrackIndex}
        onSelectTrack={playTrackIndex}
        onRemoveTrack={removeTrack}
        onAddFiles={handleAddNewTrack}
        onAddFolderBatch={handleImportFolderBatch}
        theme={activeTheme}
        onClose={() => setIsPlaylistVisible(false)}
        isVisible={isPlaylistVisible}
        folders={folders}
        onCreateFolder={createFolder}
        onRenameFolder={renameFolder}
        onDeleteFolder={deleteFolder}
        onMoveTrackToFolder={moveTrackToFolder}
      />

      {/* 3. FLOATING DIAGNOSTIC SELF-HEALING TOAST */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: '-50%', scale: 0.92 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, y: -15, x: '-50%' }}
            className="absolute top-4 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl glassmorphism max-w-xs sm:max-w-md pointer-events-auto"
            style={{ 
              borderColor: notification.type === 'error' || notification.type === 'warning' ? '#f43f5e40' : `${activeTheme.primary}45`,
              boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px ${notification.type === 'error' || notification.type === 'warning' ? '#f43f5e15' : `${activeTheme.primary}15`}`
            }}
          >
            <div className="flex-shrink-0">
              <AlertCircle size={17} className={notification.type === 'error' || notification.type === 'warning' ? 'text-rose-400 animate-bounce' : 'text-cyan-400'} style={{ color: notification.type === 'error' || notification.type === 'warning' ? '#f43f5e' : activeTheme.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 leading-relaxed font-sans">
                {notification.message}
              </p>
            </div>
            <button 
              onClick={clearNotification}
              className="flex-shrink-0 cursor-pointer p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

