/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Song } from '../../types';
import { db } from '../../database/db';
import { ShieldAlert, Trash2, CheckCircle, RefreshCw, AlertTriangle, FileUp, Database, FileMinus } from 'lucide-react';
import { useToastStore } from '../common/Toast';

interface DuplicateGroup {
  key: string;
  title: string;
  artist: string;
  tracks: Song[];
}

export const DuplicatesAndRepair: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [missingTracks, setMissingTracks] = useState<Song[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'duplicates' | 'repair'>('duplicates');

  const { showToast } = useToastStore();

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const allSongs = await db.getAllSongs();
      setSongs(allSongs);
    } catch (err) {
      console.error('Failed to load library for diagnostics:', err);
    }
  };

  const runDiagnostics = async () => {
    setIsScanning(true);
    showToast('Running library integrity scans...', 'success');

    try {
      const allSongs = await db.getAllSongs();
      setSongs(allSongs);

      // --- 1. Find Duplicates ---
      // Group by: title + artist (lowercased, normalized) or hash
      const groups: Record<string, Song[]> = {};
      allSongs.forEach((song) => {
        const key = `${song.title.trim().toLowerCase()} - ${song.artist.trim().toLowerCase()}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(song);
      });

      const dups: DuplicateGroup[] = [];
      Object.keys(groups).forEach((key) => {
        if (groups[key].length > 1) {
          dups.push({
            key,
            title: groups[key][0].title,
            artist: groups[key][0].artist,
            tracks: groups[key]
          });
        }
      });
      setDuplicates(dups);

      // --- 2. Find Missing Tracks ---
      // Check if audio blob actually exists for each song in db
      const missing: Song[] = [];
      for (const song of allSongs) {
        const audio = await db.getSongAudio(song.id);
        if (!audio || audio.size === 0) {
          missing.push(song);
        }
      }
      setMissingTracks(missing);

      showToast('Scan complete!', 'success');
    } catch (err) {
      console.error('Failed running diagnostics:', err);
      showToast('Error occurred during scans', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeleteDuplicate = async (songId: string, groupKey: string) => {
    if (!confirm('Are you sure you want to permanently delete this duplicate track from your disk database?')) return;
    try {
      await db.deleteSong(songId);
      showToast('Duplicate song deleted successfully', 'success');

      // Update state
      setDuplicates((prev) => 
        prev.map((g) => {
          if (g.key === groupKey) {
            return { ...g, tracks: g.tracks.filter(t => t.id !== songId) };
          }
          return g;
        }).filter(g => g.tracks.length > 1)
      );
      loadLibrary();
    } catch (err) {
      console.error(err);
      showToast('Error deleting track', 'error');
    }
  };

  const handleRepairPath = async (song: Song, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast(`Repairing path for "${song.title}"...`, 'success');

    try {
      // Re-save the song metadata with the uploaded file blob
      await db.saveSong(song, file);
      showToast(`Successfully repaired: "${song.title}"`, 'success');
      
      // Update missing list
      setMissingTracks(prev => prev.filter(t => t.id !== song.id));
      loadLibrary();
    } catch (err) {
      console.error(err);
      showToast('Repair failed. Please select a valid audio file.', 'error');
    }
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 backdrop-blur-md h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 tracking-wide text-sm">Library Diagnostics & Repair</h3>
            <p className="text-xs text-zinc-400">Detect and resolve duplicate songs or repair missing and broken file links</p>
          </div>
        </div>

        <button
          onClick={runDiagnostics}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/40 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/15 transition-all self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning database...' : 'Run Diagnostics Scan'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-6">
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'duplicates'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Duplicate Songs ({duplicates.length})
        </button>
        <button
          onClick={() => setActiveTab('repair')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'repair'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Missing Files & Path Repair ({missingTracks.length})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-600">
            <Database className="h-8 w-8 mb-2 opacity-50" />
            <span className="text-xs">Database is empty. Import tracks first.</span>
          </div>
        ) : !isScanning && duplicates.length === 0 && missingTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2" />
            <span className="text-xs font-semibold">Your database is completely healthy!</span>
            <p className="text-[10px] text-zinc-500 mt-1">Run a scan above to search for duplicates or broken links</p>
          </div>
        ) : activeTab === 'duplicates' ? (
          /* DUPLICATES TAB */
          <div className="space-y-4">
            {duplicates.map((group) => (
              <div key={group.key} className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                  <div>
                    <h4 className="font-semibold text-xs text-zinc-200">{group.title}</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">{group.artist}</p>
                  </div>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-lg font-bold">
                    {group.tracks.length} duplicates
                  </span>
                </div>

                <div className="space-y-2">
                  {group.tracks.map((track) => (
                    <div key={track.id} className="flex items-center justify-between bg-white/2 hover:bg-white/5 rounded-lg p-2.5 px-3 text-xs transition-colors">
                      <div className="overflow-hidden mr-4">
                        <span className="block font-medium text-zinc-300 truncate">ID: {track.id.substring(0, 8)}...</span>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5 font-mono">
                          <span>{(track.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span>{track.format.toUpperCase()}</span>
                          <span>•</span>
                          <span>Imported {new Date(track.addedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDeleteDuplicate(track.id, group.key)}
                          title="Delete this copy"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* PATH REPAIR TAB */
          <div className="space-y-3">
            {missingTracks.map((track) => (
              <div key={track.id} className="flex items-center justify-between bg-zinc-950/30 border border-white/5 rounded-xl p-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 mt-0.5">
                    <AlertTriangle className="h-4 w-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-200">{track.title}</h4>
                    <p className="text-[10px] text-zinc-400 font-medium">{track.artist} • {track.album}</p>
                    <span className="text-[9px] font-mono text-amber-500/80 bg-amber-500/10 rounded px-1.5 py-0.5 mt-1.5 inline-block">
                      BROKEN PATH / EMPTY BLOB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg text-[10px] font-bold border border-purple-500/20 cursor-pointer transition-all shadow-md">
                    <FileUp className="h-3.5 w-3.5" />
                    <span>Repair Link</span>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a,.flac"
                      onChange={(e) => handleRepairPath(track, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
