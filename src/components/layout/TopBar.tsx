/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Search, FolderSync, PlusCircle, FolderOpen, Loader2, Menu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { LibraryScanner } from '../../electron/scanner';
import { useToastStore } from '../common/Toast';

export const TopBar: React.FC = () => {
  const { searchQuery, setSearchQuery, scanStatus, updateScanStatus, setView, setDrawerOpen } = useAppStore();
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  const handleScanProgress = (progress: any) => {
    updateScanStatus({
      totalFiles: progress.totalFiles,
      processed: progress.processed,
      currentSong: progress.currentSong,
      status: progress.status,
      percent: progress.percent,
      isScanning: progress.status !== 'Finished'
    });

    if (progress.status === 'Finished') {
      showToast(`Scan complete! Imported ${progress.addedCount} songs.`, 'success');
      // Force reload list page by notifying state
      useAppStore.getState().setView('library');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    updateScanStatus({ isScanning: true });
    showToast(`Scanning ${files.length} files...`, 'info');

    try {
      const scanner = new LibraryScanner(handleScanProgress);
      await scanner.scanFiles(files as File[]);
    } catch (err) {
      console.error(err);
      showToast('Error occurred during file importation', 'error');
      updateScanStatus({ isScanning: false });
    }
  };

  return (
    <div className="flex h-16 w-full items-center justify-between border-b border-white/5 bg-zinc-950/40 md:px-6 px-4 backdrop-blur-md gap-3">
      {/* Mobile Drawer Trigger & Search wrapper */}
      <div className="flex items-center gap-3 flex-1 md:flex-none">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-zinc-900/40 text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all active:scale-95"
          title="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-3 flex items-center text-zinc-400 pointer-events-none">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim() !== '') {
                setView('search');
              }
            }}
            placeholder="Search track, artist, album, genre..."
            className="h-10 w-full rounded-xl border border-white/5 bg-zinc-900/40 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:bg-zinc-900/80 focus:ring-1 focus:ring-purple-500/50 focus:outline-none transition-all duration-200"
            id="search-input"
          />
        </div>
      </div>

      {/* Import / Scanner Progress */}
      <div className="flex items-center gap-4">
        {scanStatus.isScanning && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 text-xs text-purple-400 font-medium">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Importing: {scanStatus.percent}%</span>
            </div>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                style={{ width: `${scanStatus.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Triggers - Hidden on small screens to avoid clutter */}
        <div className="hidden sm:flex items-center gap-2">
          {/* File input loaders */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".mp3,.wav,.flac,.aac,.ogg,.m4a"
            onChange={handleFileChange}
            className="hidden"
            id="files-selector"
          />
          <input
            ref={dirInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            directory="true"
            onChange={handleFileChange}
            className="hidden"
            id="directory-selector"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanStatus.isScanning}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/60 px-4 text-xs font-semibold text-zinc-200 hover:bg-white/5 active:scale-95 disabled:opacity-50 transition-all duration-150"
            title="Import individual music files"
          >
            <PlusCircle className="h-4 w-4 text-purple-400" />
            <span className="hidden lg:inline">Import Songs</span>
            <span className="lg:hidden">Songs</span>
          </button>

          <button
            onClick={() => dirInputRef.current?.click()}
            disabled={scanStatus.isScanning}
            className="flex h-10 items-center gap-2 rounded-xl bg-purple-600 px-4 text-xs font-semibold text-white hover:bg-purple-500 active:scale-95 disabled:opacity-50 shadow-lg shadow-purple-600/10 transition-all duration-150"
            title="Import an entire folder of music"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden lg:inline">Import Folder</span>
            <span className="lg:hidden">Folder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
