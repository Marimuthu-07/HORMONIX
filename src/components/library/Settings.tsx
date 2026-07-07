/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Palette, Info, RotateCcw, ShieldAlert, Cpu, Sliders, Play } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../common/Toast';
import { db } from '../../database/db';
import { useAppStore } from '../../store/useAppStore';
import { Equalizer } from './Equalizer';
import { audioEngine } from '../../audio/AudioEngine';

export const SettingsView: React.FC = () => {
  const { 
    accentColor, 
    crossfadeDuration, 
    replayGainMode, 
    updateSetting 
  } = useSettingsStore();
  const { showToast } = useToastStore();
  const [debugLog, setDebugLog] = useState<string[]>(['[System] Hormonix audio framework online.']);

  const accents = [
    { id: 'purple' as const, color: '#a855f7', label: 'Sunset Purple' },
    { id: 'blue' as const, color: '#3b82f6', label: 'Deep Blue' },
    { id: 'green' as const, color: '#10b981', label: 'Neon Green' },
    { id: 'orange' as const, color: '#f97316', label: 'Ember Orange' },
    { id: 'pink' as const, color: '#ec4899', label: 'Vibrant Pink' },
  ];

  const handleResetDatabase = async () => {
    if (confirm('CRITICAL WARNING:\n\nThis will clear all imported tracks, cover art blobs, play counts, and playlists from your local IndexedDB database.\n\nAre you absolutely sure you want to perform a factory reset?')) {
      try {
        await db.clearDatabase();
        setDebugLog((prev) => [...prev, '[Database] Local recordsets successfully purged.']);
        showToast('IndexedDB cleared. Restarting scanner context.', 'success');
        useAppStore.getState().setView('library');
      } catch (err) {
        showToast('Purging failed.', 'error');
      }
    }
  };

  const handleCrossfadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateSetting('crossfadeDuration', val);
    audioEngine.setCrossfadeDuration(val);
    showToast(`Crossfade set to ${val}s`, 'success');
  };

  const handleReplayGainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'off' | 'track' | 'album';
    updateSetting('replayGainMode', val);
    audioEngine.setReplayGainMode(val);
    showToast(`ReplayGain set to: ${val}`, 'success');
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-4xl custom-scrollbar" id="settings-view-page">
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">Configurations</h2>
        <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-purple-400" />
          <span>System Settings & DSP</span>
        </h1>
      </div>

      <div className="flex flex-col gap-8 pb-12">
        {/* Equalizer Panel */}
        <Equalizer />

        {/* Advanced Audio Prefs Panel */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-purple-400" />
            <span>Advanced Audio Transitions</span>
          </h2>

          <div className="space-y-6">
            {/* Crossfade Duration */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">Automatic Track Crossfade</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-md leading-relaxed">
                  Smoothly blend the end of the current track into the start of the next track automatically over several seconds.
                </p>
              </div>
              <div className="flex items-center gap-4 flex-1 md:flex-initial max-w-xs w-full">
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={crossfadeDuration !== undefined ? crossfadeDuration : 4}
                  onChange={handleCrossfadeChange}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-xs font-mono font-bold text-purple-400 w-12 text-right">
                  {crossfadeDuration !== undefined ? crossfadeDuration : 4}s
                </span>
              </div>
            </div>

            {/* ReplayGain Normalization */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-white/5 pt-6">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">ReplayGain Volume Normalization</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-md leading-relaxed">
                  Analyze metadata tracks and normalize playback volume levels to prevent ear strain and clipping distortion.
                </p>
              </div>
              <select
                value={replayGainMode || 'off'}
                onChange={handleReplayGainChange}
                className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-purple-500/30 w-full md:w-44"
              >
                <option value="off">Disabled (Off)</option>
                <option value="track">Track-Level Gain</option>
                <option value="album">Album-Level Gain</option>
              </select>
            </div>
          </div>
        </div>

        {/* Accent customization panel */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4 text-purple-400" />
            <span>Theme Accent Selection</span>
          </h2>
          <p className="text-xs text-zinc-400 mb-6">Select your primary accent color. This controls glowing buttons, active indicators, and highlighting.</p>
          <div className="flex flex-wrap gap-4">
            {accents.map((acc) => {
              const isActive = accentColor.toLowerCase() === acc.color.toLowerCase();
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    updateSetting('accentColor', acc.color);
                    showToast(`Accent updated: ${acc.label}`, 'success');
                    setDebugLog((prev) => [...prev, `[Theme] Color scheme updated to ${acc.label}.`]);
                  }}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-semibold hover:bg-white/5 active:scale-95 transition-all duration-150 ${
                    isActive 
                      ? 'border-purple-500/30 bg-purple-500/10 text-white' 
                      : 'border-white/5 bg-zinc-900/40 text-zinc-400'
                  }`}
                >
                  <div className="h-4.5 w-4.5 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: acc.color }} />
                  <span>{acc.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Database administration panel */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span>Database & System Tools</span>
          </h2>
          <p className="text-xs text-zinc-400 mb-6">Perform administrative operations on IndexedDB and audio playback engines.</p>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t border-white/5 pt-6">
            <div>
              <h4 className="text-sm font-semibold text-zinc-100">Factory Purge Database</h4>
              <p className="text-xs text-zinc-500 mt-1 max-w-lg leading-relaxed">
                Clears all imported metadata and audio buffers entirely. Use this if your library files became corrupt or you wish to start from scratch.
              </p>
            </div>
            <button
              onClick={handleResetDatabase}
              className="flex h-11 items-center gap-2 rounded-xl bg-red-600/10 border border-red-500/15 px-5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all duration-150 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Purge Local Database</span>
            </button>
          </div>
        </div>

        {/* Developer / system log debugging area */}
        <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
          <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-purple-400" />
            <span>Developer Log Console</span>
          </h2>
          <div className="h-36 overflow-y-auto rounded-2xl border border-white/5 bg-zinc-950 p-4 font-mono text-[10px] text-zinc-400 leading-relaxed flex flex-col gap-1">
            {debugLog.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className="bg-zinc-900/10 border border-white/5 rounded-3xl p-6 flex items-start gap-4">
          <Info className="h-5 w-5 text-purple-400 mt-0.5" />
          <div className="text-xs text-zinc-500 leading-relaxed max-w-lg">
            <span className="text-zinc-300 font-semibold block mb-1">Hormonix Offline Player</span>
            Version 5.0.0 (Professional Audio DSP Release)
            <br />
            Configured with high-performance audio decoders, multi-threaded audio context nodes, IndexedDB local storage, and instant-scroller table grids.
          </div>
        </div>
      </div>
    </div>
  );
};
