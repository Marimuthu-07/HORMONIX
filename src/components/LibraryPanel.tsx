import React, { useState, useMemo, useRef } from 'react';
import { Track, Theme, Folder } from '../types';
import { 
  Folder as FolderIcon, FolderPlus, Home, Plus, SlidersHorizontal, Sliders, ChevronRight, 
  Trash2, Edit3, ArrowLeft, Play, Music, Disc, Clock, Upload, List, Grid, LayoutGrid, ArrowUpDown, ChevronDown
} from 'lucide-react';

interface LibraryPanelProps {
  playlist: Track[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  removeTrack: (index: number) => void;
  theme: Theme;
  folders: Folder[];
  onCreateFolder: (name: string, parentId: string | null) => string;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveTrackToFolder: (trackId: string, destFolderId: string | null) => void;
  onAddFolderBatch?: (files: File[]) => void;
  onAddFiles?: (files: File[]) => void;
}

export default function LibraryPanel({
  playlist,
  currentTrackIndex,
  onSelectTrack,
  removeTrack,
  theme,
  folders,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTrackToFolder,
  onAddFolderBatch,
  onAddFiles
}: LibraryPanelProps) {
  // Navigation inside structures
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isFolderLayout, setIsFolderLayout] = useState<boolean>(false);
  
  // Custom View States
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid' | 'compact'>('list');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album' | 'duration'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Input states
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderNameInput, setEditFolderNameInput] = useState<string>('');
  const [showCreateFolderInline, setShowCreateFolderInline] = useState<boolean>(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState<string>('');

  // Refs
  const directoryInputRef = useRef<HTMLInputElement>(null);
  const libFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Folder helper methods
  const getBreadcrumbs = () => {
    const list = [];
    let activeId = currentFolderId;
    while (activeId !== null) {
      const folder = folders.find(f => f.id === activeId);
      if (!folder) break;
      list.unshift(folder);
      activeId = folder.parentId;
    }
    return list;
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderNameInput.trim()) return;
    onCreateFolder(newFolderNameInput, currentFolderId);
    setNewFolderNameInput('');
    setShowCreateFolderInline(false);
  };

  const handleSaveRenameFolder = (id: string) => {
    if (!editFolderNameInput.trim()) return;
    onRenameFolder(id, editFolderNameInput);
    setEditingFolderId(null);
    setEditFolderNameInput('');
  };

  // Drag and Drop offline audio
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
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      if (onAddFiles) {
        onAddFiles(filesArray);
      }
    }
  };

  const handleFolderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      if (onAddFolderBatch) {
        onAddFolderBatch(filesArray);
      }
    }
  };

  const handleTrackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      if (onAddFiles) {
        onAddFiles(filesArray);
      }
    }
  };

  // Compile layout track listings
  const listTracks = useMemo(() => {
    let list = [...playlist];

    // Sort mappings
    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortBy === 'title') { valA = a.title; valB = b.title; }
      else if (sortBy === 'artist') { valA = a.artist; valB = b.artist; }
      else if (sortBy === 'album') { valA = a.album; valB = b.album; }
      else if (sortBy === 'duration') {
        return sortOrder === 'asc' ? a.duration - b.duration : b.duration - a.duration;
      }

      return sortOrder === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });

    return list;
  }, [playlist, sortBy, sortOrder]);

  const toggleSort = (field: 'title' | 'artist' | 'album' | 'duration') => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 select-none" id="neonwave-library-root">
      
      {/* 1. LAYOUT MODIFIER CONTROL RACK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3" id="library-ctrls-hub">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFolderLayout(false)}
            className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer outline-none ${
              !isFolderLayout 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'text-zinc-400 hover:text-white bg-zinc-900/40'
            }`}
            style={!isFolderLayout ? { backgroundColor: theme.primary, color: '#000000' } : {}}
          >
            <List size={11} />
            <span>Linear Library ({playlist.length})</span>
          </button>
          
          <button
            onClick={() => {
              setIsFolderLayout(true);
              setCurrentFolderId(null);
            }}
            className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer outline-none ${
              isFolderLayout 
                ? 'bg-white text-black font-extrabold shadow-md' 
                : 'text-zinc-400 hover:text-white bg-zinc-900/40'
            }`}
            style={isFolderLayout ? { backgroundColor: theme.primary, color: '#000000' } : {}}
          >
            <FolderIcon size={11} />
            <span>Folder Directories ({folders.length})</span>
          </button>
        </div>

        {/* View Layout Options */}
        {!isFolderLayout && (
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-900 border border-white/5 rounded-lg p-0.5">
              {(['list', 'grid', 'compact'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setLayoutMode(mode)}
                  className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-semibold uppercase flex items-center gap-1 transition-all ${
                    layoutMode === mode ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  style={layoutMode === mode ? { color: theme.secondary } : {}}
                >
                  {mode === 'grid' ? <LayoutGrid size={11} /> : mode === 'compact' ? <Sliders size={11} /> : <List size={11} />}
                  <span className="hidden sm:inline capitalize">{mode}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. DIRECTORY TREE STRUCTURES RENDERING */}
      {isFolderLayout ? (
        <div className="space-y-4" id="folders-view-stack">
          {/* Breadcrumbs panel & Creater form */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/40 p-3 rounded-xl border border-white/5" id="library-folders-navigator">
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <button 
                onClick={() => setCurrentFolderId(null)}
                className="hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Home size={12} className="text-[#00e5ff]" style={{ color: theme.secondary }} />
                <span className="font-bold">Root Directory</span>
              </button>
              {getBreadcrumbs().map((b) => (
                <React.Fragment key={b.id}>
                  <span className="text-zinc-700 font-mono">/</span>
                  <button 
                    onClick={() => setCurrentFolderId(b.id)}
                    className="hover:text-white text-zinc-300 font-semibold truncate max-w-[120px] cursor-pointer"
                  >
                    {b.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {showCreateFolderInline ? (
                <form onSubmit={handleCreateFolder} className="flex items-center gap-1">
                  <input 
                    type="text" 
                    value={newFolderNameInput}
                    onChange={(e) => setNewFolderNameInput(e.target.value)}
                    placeholder="New directory name..."
                    autoFocus
                    className="bg-black/80 px-2 py-1 text-xs text-white border border-white/10 rounded focus:outline-none focus:border-violet-500 font-sans"
                  />
                  <button type="submit" className="bg-[#00e5ff] text-zinc-950 text-[10px] font-bold px-2 py-1 rounded hover:scale-105 transition-all">OK</button>
                  <button type="button" onClick={() => setShowCreateFolderInline(false)} className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-1 rounded">Cancel</button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setShowCreateFolderInline(true)}
                    className="bg-zinc-950 hover:bg-zinc-900 text-zinc-300 text-[10.5px] px-2.5 py-1 border border-white/5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FolderPlus size={11} style={{ color: theme.primary }} />
                    <span>Create Directory Folder</span>
                  </button>
                  
                  {onAddFolderBatch && (
                    <button
                      onClick={() => directoryInputRef.current?.click()}
                      className="bg-zinc-950 hover:bg-zinc-910 text-zinc-300 text-[10.5px] px-2.5 py-1 border border-white/5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Upload size={11} style={{ color: theme.secondary }} />
                      <span>Mirror Local Folder 📂</span>
                      <input 
                        type="file" 
                        ref={directoryInputRef}
                        onChange={handleFolderFileChange}
                        className="hidden"
                        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* List of folders in same depth */}
          {(() => {
            const activeSubfolders = folders.filter(f => f.parentId === currentFolderId);
            if (activeSubfolders.length === 0 && currentFolderId === null) {
              return null;
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-900/10 p-4 border border-white/[0.02] rounded-2xl">
                {activeSubfolders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="group border border-white/5 hover:border-white/15 bg-zinc-950/40 rounded-xl p-3 flex items-center justify-between hover:bg-zinc-900/20 transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FolderIcon size={14} className="text-[#ff4d9d] flex-shrink-0 animate-pulse" style={{ color: theme.accent }} />
                      {editingFolderId === folder.id ? (
                        <input
                          type="text"
                          value={editFolderNameInput}
                          onChange={(e) => setEditFolderNameInput(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameFolder(folder.id);
                          }}
                          onBlur={() => handleSaveRenameFolder(folder.id)}
                          className="bg-black/95 px-1.5 py-0.5 rounded text-xs text-white border border-white/15 italic"
                          autoFocus
                        />
                      ) : (
                        <span className="text-xs font-bold text-zinc-200 truncate group-hover:text-white">{folder.name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolderId(folder.id);
                          setEditFolderNameInput(folder.name);
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity text-[10px] cursor-pointer"
                        title="Rename Directory"
                      >
                        <Edit3 size={11} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete folder "${folder.name}"? Tracks inside will return to Root Library.`)) {
                            onDeleteFolder(folder.id);
                          }
                        }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity text-[10px] cursor-pointer"
                        title="Delete Directory"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Render tracks on folders */}
          <div className="space-y-2 mt-4">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Tracks in Directory</h3>
            {(() => {
              const assignedTrackIds = new Set(folders.flatMap(f => f.trackIds));
              const currentFolderTracks = currentFolderId === null 
                ? playlist.filter(track => !assignedTrackIds.has(track.id))
                : playlist.filter(track => {
                    const cf = folders.find(f => f.id === currentFolderId);
                    return cf?.trackIds.includes(track.id);
                  });

              if (currentFolderTracks.length === 0) {
                return (
                  <div className="bg-zinc-950/20 border border-dashed border-zinc-900 rounded-2xl p-12 text-center text-zinc-600 text-xs">
                    <FolderIcon size={25} className="mx-auto mb-2 text-zinc-700" />
                    <span>No tracks in this physical directory. Map tracks to folders below.</span>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto w-full bg-zinc-950/20 border border-white/5 rounded-2xl p-2">
                  <table className="w-full text-left border-collapse table-auto text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] text-zinc-500 font-black uppercase">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Title</th>
                        <th className="py-2.5 px-3">Format Mapping</th>
                        <th className="py-2.5 px-3">Relocate Path</th>
                        <th className="py-2.5 px-3 text-right pr-6">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/30">
                      {currentFolderTracks.map((track, idx) => {
                        const originalIdx = playlist.findIndex(t => t.id === track.id);
                        const isPrimary = track.id === 'synth-loop';
                        return (
                          <tr
                            key={track.id}
                            onClick={() => onSelectTrack(originalIdx)}
                            className={`group cursor-pointer hover:bg-white/[0.03] transition-colors rounded-lg ${
                              originalIdx === currentTrackIndex ? 'bg-zinc-900/30' : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center text-zinc-600 font-mono">
                              <span className="group-hover:hidden">{idx + 1}</span>
                              <Play size={10} className="hidden group-hover:inline mx-auto text-white" />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate max-w-[150px] sm:max-w-xs">{track.title}</p>
                                  <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-zinc-500 font-mono text-[9.5px]">
                              <span className="bg-zinc-950 border border-white/5 py-0.2 px-1.5 rounded mr-1 text-zinc-350 font-bold">{track.format}</span>
                              <span>{track.bitrate || '320kbps'}</span>
                            </td>
                            <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                              <select
                                value={currentFolderId || 'root'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  onMoveTrackToFolder(track.id, val === 'root' ? null : val);
                                }}
                                className="bg-zinc-950 text-[10px] border border-white/5 rounded px-2 py-0.5 text-zinc-400 hover:text-white cursor-pointer"
                              >
                                <option value="root">📁 Root / Unassigned</option>
                                {folders.map(f => (
                                  <option key={f.id} value={f.id}>📁 {f.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right pr-6 font-mono text-zinc-500 text-[10px]">
                              {formatTime(track.duration)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* 3. LINEAR LIBRARY MULTI-REPRESENTATIONS */
        <div className="space-y-4">
          
          {/* DRAG-AND-DROP CONTAINER FOR BATCH UPLOAD */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => libFileInputRef.current?.click()}
            className="cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all relative overflow-hidden flex flex-col items-center justify-center gap-1.5 min-h-[120px] hover:bg-white/5 pointer-events-auto"
            style={{
              borderColor: isDragOver ? theme.primary : 'rgba(255,255,255,0.06)',
              backgroundColor: isDragOver ? `${theme.primary}0a` : 'transparent'
            }}
            id="library-drag-uploader"
          >
            <input 
              type="file" 
              ref={libFileInputRef}
              onChange={handleTrackFileChange}
              multiple
              accept="audio/*,.mp3,.m4a,.flac,.wav,.ogg"
              className="hidden"
            />
            <Upload size={22} className="text-zinc-500 hover:scale-105 transition-transform" style={{ color: theme.secondary }} />
            <span className="text-xs font-bold text-zinc-200">Import Audio Files / Songs</span>
            <span className="text-[10px] text-zinc-500">
              Drag-and-drop local audio files directly here, or click to browse files
            </span>
            <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${theme.primary}, transparent)` }} />
          </div>

          {/* TABLE HEADERS & COLUMN DIRECTION SORTING */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider pl-1 border-b border-zinc-900 pb-2 select-none">
            <div className="flex items-center gap-5">
              <button onClick={() => toggleSort('title')} className="hover:text-white flex items-center gap-1 cursor-pointer">
                <span>Song Title</span>
                {sortBy === 'title' && <ChevronDown size={11} className={`transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
              </button>
              <button onClick={() => toggleSort('artist')} className="hover:text-white flex items-center gap-1 cursor-pointer hidden sm:flex">
                <span>Artist</span>
                {sortBy === 'artist' && <ChevronDown size={11} className={`transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
              </button>
            </div>
            
            <div className="flex items-center gap-6">
              <span className="hidden md:inline">Encoder Format</span>
              <button onClick={() => toggleSort('duration')} className="hover:text-white flex items-center gap-1 pr-6 cursor-pointer">
                <span>Duration</span>
                {sortBy === 'duration' && <ChevronDown size={11} className={`transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />}
              </button>
            </div>
          </div>

          {/* LIST MODE REPRESENTATION */}
          {layoutMode === 'list' && (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1" id="lib-mode-list-deck">
              {listTracks.map((track, idx) => {
                const originalIdx = playlist.findIndex(t => t.id === track.id);
                const isSynth = track.coverUrl === 'synthwave';
                return (
                  <div
                    key={track.id}
                    onClick={() => onSelectTrack(originalIdx)}
                    className={`p-2.5 rounded-xl border border-white/[0.02] hover:border-white/10 flex items-center justify-between group cursor-pointer transition-colors ${
                      originalIdx === currentTrackIndex ? 'bg-[#111827]/60' : 'bg-transparent hover:bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-zinc-650 w-5 text-center group-hover:hidden">
                        {idx + 1}
                      </span>
                      <Play size={10} className="hidden group-hover:inline text-white w-5 text-center" />

                      <div className="w-8 h-8 rounded bg-zinc-950 flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden">
                        {isSynth ? (
                          <Disc size={13} className="text-violet-500 animate-spin-slow" />
                        ) : track.coverUrl ? (
                          <img src={track.coverUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <Music size={13} className="text-zinc-650" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold truncate text-white uppercase tracking-tight group-hover:text-[#00e5ff] transition-colors">{track.title}</h4>
                        <p className="text-[10px] text-zinc-500 truncate">{track.artist} &bull; <span className="text-zinc-600 font-normal">{track.album}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 font-mono text-[9.5px] text-zinc-500">
                      <select
                        onClick={e => e.stopPropagation()}
                        value={folders.find(f => f.trackIds.includes(track.id))?.id || 'root'}
                        onChange={(e) => {
                          const val = e.target.value;
                          onMoveTrackToFolder(track.id, val === 'root' ? null : val);
                        }}
                        className="bg-zinc-950 text-[9px] border border-white/5 rounded px-1.5 py-0.5 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <option value="root">📁 Root</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>📁 {f.name}</option>
                        ))}
                      </select>
                      <span className="hidden md:inline text-zinc-450 font-bold bg-zinc-950 border border-white/5 py-0.2 px-1 rounded">{track.format}</span>
                      <span className="text-[10.5px] w-12 text-right pr-4">{formatTime(track.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID THUMBNAILS REPRESENTATION */}
          {layoutMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1" id="lib-mode-grid-deck">
              {listTracks.map((track) => {
                const originalIdx = playlist.findIndex(t => t.id === track.id);
                const isSynth = track.coverUrl === 'synthwave';
                return (
                  <div
                    key={track.id}
                    onClick={() => onSelectTrack(originalIdx)}
                    className="bg-zinc-900/40 hover:bg-zinc-800/40 border border-white/5 hover:border-white/10 rounded-xl p-3 cursor-pointer transition-transform hover:-translate-y-0.5 duration-150 flex flex-col gap-2 group"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center border border-white/5">
                      {isSynth ? (
                        <div className="w-full h-full bg-linear-to-tr from-slate-900 via-zinc-950 to-indigo-950 flex items-center justify-center">
                          <Disc size={28} className="text-[#00e5ff] animate-spin-slow" />
                        </div>
                      ) : track.coverUrl ? (
                        <img src={track.coverUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <Music size={24} className="text-zinc-650 animate-pulse" />
                      )}

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={18} className="text-white fill-white scale-90 group-hover:scale-100 transition-transform" />
                      </div>
                    </div>

                    <div className="min-w-0 text-center">
                      <h4 className="text-[11px] font-bold truncate text-white uppercase tracking-tight group-hover:text-[#00e5ff] transition-colors">{track.title}</h4>
                      <p className="text-[9.5px] text-zinc-500 truncate">{track.artist}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* COMPACT MATRIX REPRESENTATION */}
          {layoutMode === 'compact' && (
            <div className="space-y-1 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1" id="lib-mode-compact-deck">
              {listTracks.map((track, idx) => {
                const originalIdx = playlist.findIndex(t => t.id === track.id);
                return (
                  <div
                    key={track.id}
                    onClick={() => onSelectTrack(originalIdx)}
                    className={`py-1.5 px-3 rounded-lg flex items-center justify-between text-[11px] cursor-pointer hover:bg-white/5 transition-colors font-mono ${
                      originalIdx === currentTrackIndex ? 'text-[#00e5ff]' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-grow">
                      <span className="text-[10px] text-zinc-600 w-4">{idx + 1}</span>
                      <span className="font-semibold text-zinc-100 hover:text-white truncate uppercase tracking-tight">{track.title}</span>
                      <span className="text-zinc-500 truncate max-w-[120px]">- {track.artist}</span>
                    </div>

                    <div className="flex items-center gap-4 text-zinc-500 text-[10.5px]">
                      <span className="hidden sm:inline bg-zinc-950 px-1 rounded text-[8.5px] text-zinc-400 font-bold">{track.format}</span>
                      <span>{formatTime(track.duration)}</span>
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
