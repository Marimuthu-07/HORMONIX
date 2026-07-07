import React, { useRef, useState } from 'react';
import { Track, Theme, Folder } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, Play, Disc, Trash2, Upload, Plus, FileAudio, Music2,
  Volume2, HelpCircle
} from 'lucide-react';

interface PlaylistProps {
  playlist: Track[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (id: string, e: React.MouseEvent) => void;
  onAddFiles: (file: File) => void;
  onAddFolderBatch: (files: File[]) => void;
  theme: Theme;
  onClose: () => void;
  isVisible: boolean;
  folders: Folder[];
  onCreateFolder: (name: string, parentId: string | null) => string;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveTrackToFolder: (trackId: string, destFolderId: string | null) => void;
}

export default function Playlist({
  playlist,
  currentTrackIndex,
  onSelectTrack,
  onRemoveTrack,
  onAddFiles,
  onAddFolderBatch,
  theme,
  onClose,
  isVisible,
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTrackToFolder
 }: PlaylistProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterFolderId, setFilterFolderId] = useState<string>('all');

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      (Array.from(e.dataTransfer.files) as File[]).forEach((file: File) => {
        if (file.type.startsWith('audio/') || file.name.endsWith('.flac') || file.name.endsWith('.wav') || file.name.endsWith('.mp3') || file.name.endsWith('.m4a')) {
          onAddFiles(file);
        }
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      (Array.from(e.target.files) as File[]).forEach((file: File) => {
        onAddFiles(file);
      });
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      onAddFolderBatch(filesArray);
    }
  };

  // Helper formats
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '--:--';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter tracks list based on directory selector
  const filteredTracks = playlist.filter(track => {
    if (filterFolderId === 'all') return true;
    
    const assignedTrackIds = new Set(folders.flatMap(f => f.trackIds));
    if (filterFolderId === 'root') return !assignedTrackIds.has(track.id);
    
    const selectedFolder = folders.find(f => f.id === filterFolderId);
    return selectedFolder?.trackIds.includes(track.id) || false;
  });

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Overlay mask for ambient blur clickout */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40 lg:hidden"
            id="playlist-overlay"
          />

          {/* Core Sliding Drawer */}
          <motion.div
            initial={{ x: 320, opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`fixed right-0 top-0 bottom-0 w-80 max-w-full glassmorphism z-50 flex flex-col border-l shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl ${theme.card} ${theme.border}`}
            id="mini-playlist-panel"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: `${theme.primary}15` }}>
              <div className="flex items-center gap-2">
                <Music size={16} style={{ color: theme.primary }} className="animate-pulse" />
                <h3 className="font-sans font-semibold text-sm tracking-wide text-white uppercase">
                  Library Engine
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 font-mono">
                  {playlist.length}
                </span>
              </div>
              <button 
                onClick={onClose}
                className="cursor-pointer text-xs font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 transition-colors duration-200"
              >
                CLOSE
              </button>
            </div>

            {/* Drag & Drop Upload Container */}
            <div className="p-3 border-b flex flex-col gap-2" style={{ borderColor: `${theme.primary}10` }}>
              {/* Box 1: Files */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border border-dashed rounded-lg p-2 text-center transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center gap-0.5 min-h-[65px] hover:bg-white/5"
                style={{
                  borderColor: isDragOver ? theme.primary : `${theme.primary}25`,
                  backgroundColor: isDragOver ? `${theme.primary}10` : 'transparent'
                }}
                id="uploader-zone"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="audio/*,.mp3,.m4a,.flac,.wav,.ogg"
                  className="hidden"
                />
                <div className="flex items-center gap-1.5 justify-center">
                  <Upload size={13} style={{ color: isDragOver ? theme.primary : theme.secondary }} />
                  <span className="text-[10.5px] font-semibold text-white">Import Songs / Tracks</span>
                </div>
                <span className="text-[9.5px]" style={{ color: theme.textMuted }}>
                  Drag files or click to browse
                </span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5 animate-pulse" style={{ background: `linear-gradient(90deg, transparent, ${theme.secondary}, transparent)` }} />
              </div>

              {/* Box 2: Folder Directory */}
              <div
                onClick={() => folderInputRef.current?.click()}
                className="cursor-pointer border border-dashed rounded-lg p-2 text-center transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center gap-0.5 min-h-[65px] hover:bg-white/5"
                style={{
                  borderColor: `${theme.primary}25`,
                  backgroundColor: 'transparent'
                }}
                id="folder-uploader-zone"
              >
                <input 
                  type="file" 
                  ref={folderInputRef}
                  onChange={handleFolderChange}
                  className="hidden"
                  {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                />
                <div className="flex items-center gap-1.5 justify-center">
                  <Plus size={13} style={{ color: theme.primary }} />
                  <span className="text-[10.5px] font-semibold text-white">Import Entire Folder 📂</span>
                </div>
                <span className="text-[9.5px]" style={{ color: theme.textMuted }}>
                  Select folder to mirror with structures
                </span>
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${theme.primary}, transparent)` }} />
              </div>
            </div>

            {/* Folder Selection Directory Filter */}
            <div className="px-3 py-2 border-b flex items-center justify-between gap-1.5 select-none" style={{ borderColor: `${theme.primary}07`, backgroundColor: 'rgba(0,0,0,0.12)' }}>
              <span className="text-[10.5px] font-bold text-zinc-400 font-sans">Folder:</span>
              <select
                value={filterFolderId}
                onChange={(e) => setFilterFolderId(e.target.value)}
                className="bg-zinc-950 border border-zinc-900 text-[10px] text-zinc-300 font-semibold rounded py-0.5 px-2 focus:outline-none w-44 cursor-pointer outline-none"
              >
                <option value="all">📂 View All Songs</option>
                <option value="root">📁 Root / Unassigned</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>📁 {f.name}</option>
                ))}
              </select>
            </div>

            {/* List block */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-1.5" id="mini-playlist-tracks">
              {filteredTracks.map((track) => {
                const originalIndex = playlist.findIndex(t => t.id === track.id);
                const isActive = originalIndex === currentTrackIndex;
                return (
                  <div
                    key={track.id}
                    onClick={() => onSelectTrack(originalIndex)}
                    className={`group cursor-pointer p-2 rounded-lg border transition-all duration-200 flex flex-col gap-1.5 relative ${
                      isActive 
                        ? 'bg-white/10' 
                        : 'bg-black/15 hover:bg-white/5'
                    }`}
                    style={{
                      borderColor: isActive ? `${theme.primary}33` : 'transparent'
                    }}
                  >
                    {/* Glowing side accent line for active song */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r" style={{ backgroundColor: theme.primary }} />
                    )}

                    <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="relative w-7 h-7 rounded-md overflow-hidden bg-zinc-800/80 flex items-center justify-center flex-shrink-0 border border-white/5">
                          {track.coverUrl === 'synthwave' ? (
                            <div className="w-full h-full bg-[#1db954] flex items-center justify-center">
                              <Disc size={11} className="text-black animate-spin-slow" />
                            </div>
                          ) : track.coverUrl ? (
                            <img 
                              src={track.coverUrl} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <FileAudio size={12} className="text-slate-400" />
                          )}
                          
                          {isActive && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <div className="flex items-end gap-0.5 h-2.5">
                                <span className="w-0.5 bg-current animate-[bounce_0.8s_infinite_100ms]" style={{ color: theme.primary }} />
                                <span className="w-0.5 bg-current animate-[bounce_0.8s_infinite_300ms]" style={{ color: theme.primary }} />
                                <span className="w-0.5 bg-current animate-[bounce_0.8s_infinite_500ms]" style={{ color: theme.primary }} />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Title details */}
                        <div className="min-w-0 flex-grow">
                          <p className="text-[11.5px] font-semibold truncate text-zinc-100" style={isActive ? { color: theme.primary } : {}}>
                            {track.title}
                          </p>
                          <p className="text-[10px] truncate max-w-[140px] text-zinc-400">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-[9px] font-mono text-zinc-500 mr-1">
                          {formatTime(track.duration)}
                        </span>
                        
                        {track.id !== 'synth-loop' && (
                          <button
                            onClick={(e) => onRemoveTrack(track.id, e)}
                            className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors hover:bg-white/5 cursor-pointer flex items-center justify-center"
                            title="Eject Track"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dir selector relocator info bar */}
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-sans border-t border-white/[0.03] pt-1.5 mt-0.5 select-none" onClick={e => e.stopPropagation()}>
                      <span>Folder location:</span>
                      <select
                        value={folders.find(f => f.trackIds.includes(track.id))?.id || 'root'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onMoveTrackToFolder(track.id, val === 'root' ? null : val);
                        }}
                        className="bg-zinc-900 border border-zinc-800 text-[9.5px] font-sans text-zinc-400 hover:text-white rounded py-0.2 px-1 focus:outline-none w-28 cursor-pointer outline-none"
                      >
                        <option value="root">📁 Root Library</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>📁 {f.name}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Drawer Footer Status indicator */}
            <div className="p-4 bg-black/60 border-t flex flex-col gap-1.5" style={{ borderColor: `${theme.primary}10` }}>
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-zinc-500">ENGINE STATUS</span>
                <span className="text-green-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  ONLINE
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 font-sans leading-normal">
                Files are loaded securely within client-side memory inside the sandbox. Supports FLAC, WAV, MP3 and browser direct decoders.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
