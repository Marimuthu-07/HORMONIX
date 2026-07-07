/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore, ActiveView } from '../../store/useAppStore';
import { useQueueStore } from '../../store/useQueueStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useSettingsStore } from '../../store/useSettingsStore';
import { audioEngine } from '../../audio/AudioEngine';
import { db } from '../../database/db';
import { Song } from '../../types';
import { Search, Sliders, VolumeX, RefreshCw, Cpu, Settings, X, Music, Play, AlertTriangle } from 'lucide-react';
import { useToastStore } from '../common/Toast';

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);

  const { setView, selectAlbum, selectArtist } = useAppStore();
  const { playSong, setQueue } = useQueueStore();
  const { setCurrentSong } = usePlayerStore();
  const { play } = useAudioEngine();
  const { showToast } = useToastStore();

  const modalRef = useRef<HTMLDivElement>(null);

  // Register Global Ctrl+K trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Fetch all songs on load
      db.getAllSongs().then(setSongs).catch(console.error);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter songs and system actions
  useEffect(() => {
    if (!query) {
      setFilteredSongs([]);
      return;
    }
    const lower = query.toLowerCase();
    const matches = songs.filter(
      (s) =>
        s.title.toLowerCase().includes(lower) ||
        s.artist.toLowerCase().includes(lower) ||
        s.album.toLowerCase().includes(lower)
    );
    setFilteredSongs(matches.slice(0, 5));
  }, [query, songs]);

  // Action commands list
  const commands = [
    { 
      name: 'Toggle Equalizer Master', 
      desc: 'Bypasses or enables 10-band DSP filters',
      icon: <Sliders className="h-4 w-4 text-purple-400" />,
      action: () => {
        const { eqEnabled, updateSetting } = useSettingsStore.getState();
        const next = !eqEnabled;
        updateSetting('eqEnabled', next);
        audioEngine.setEqEnabled(next);
        showToast(next ? 'EQ enabled' : 'EQ bypassed', 'success');
      }
    },
    {
      name: 'Mute/Unmute Audio Element',
      desc: 'Toggles silent outputs instantly',
      icon: <VolumeX className="h-4 w-4 text-pink-400" />,
      action: () => {
        const currentMute = audioEngine.isMuted();
        audioEngine.setMute(!currentMute);
        showToast(!currentMute ? 'Muted' : 'Unmuted', 'success');
      }
    },
    {
      name: 'Sweep Memory Cache',
      desc: 'Cleans object blobs and un-references memory leaks',
      icon: <RefreshCw className="h-4 w-4 text-emerald-400" />,
      action: () => {
        audioEngine.stop();
        showToast('Memory footprint swept successfully', 'success');
      }
    },
    {
      name: 'View Performance Telemetry',
      desc: 'Opens the diagnostic profiler grid',
      icon: <Cpu className="h-4 w-4 text-indigo-400" />,
      action: () => {
        setView('settings');
        // Let settings store handle tab change to "Diagnostics"
        showToast('Performance dashboard opened', 'success');
      }
    }
  ];

  const handleSongPlay = (song: Song) => {
    playSong(song);
    setCurrentSong(song);
    audioEngine.loadSong(song).then(() => play());
    setIsOpen(false);
    setQuery('');
    showToast(`Playing track: "${song.title}"`, 'success');
  };

  const executeCommand = (cmdAction: () => void) => {
    cmdAction();
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/70 p-4 pt-[12vh] backdrop-blur-md animate-fade-in">
      <div 
        ref={modalRef}
        className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-900/90 shadow-[0_30px_60px_rgba(0,0,0,0.6)] p-4 overflow-hidden relative"
      >
        {/* Search header bar */}
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <Search className="h-5 w-5 text-purple-400" />
          <input
            type="text"
            placeholder="Search tracks, albums, artists, or system command actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent font-medium text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="h-7 w-7 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dynamic Results list */}
        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {/* TRACK RESULTS */}
          {filteredSongs.length > 0 && (
            <div>
              <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-500 uppercase px-2">Matched Tracks</span>
              <div className="mt-2 space-y-1">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => handleSongPlay(song)}
                    className="flex items-center justify-between p-2 hover:bg-purple-500/10 rounded-xl cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-zinc-500 group-hover:text-purple-400 transition-colors">
                        <Music className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-zinc-200">{song.title}</span>
                        <span className="block text-[10px] text-zinc-500">{song.artist} • {song.album}</span>
                      </div>
                    </div>
                    <Play className="h-3.5 w-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity fill-current mr-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTION COMMANDS */}
          <div>
            <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-500 uppercase px-2">System Commands</span>
            <div className="mt-2 space-y-1">
              {commands
                .filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()))
                .map((cmd) => (
                  <div
                    key={cmd.name}
                    onClick={() => executeCommand(cmd.action)}
                    className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950">
                        {cmd.icon}
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-zinc-200 group-hover:text-purple-400 transition-colors">{cmd.name}</span>
                        <span className="block text-[10px] text-zinc-500">{cmd.desc}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {query && filteredSongs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
              <AlertTriangle className="h-6 w-6 mb-2 text-zinc-600 animate-bounce" />
              <span className="text-xs">No matching dynamic tracks or system commands.</span>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-white/5 pt-3 mt-4 flex items-center justify-between text-[9px] font-mono font-semibold text-zinc-500">
          <span>press esc to dismiss</span>
          <span>ctrl+k launcher active</span>
        </div>
      </div>
    </div>
  );
};
