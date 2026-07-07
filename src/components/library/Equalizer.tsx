/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { audioEngine } from '../../audio/AudioEngine';
import { Sliders, RefreshCw, Upload, Download, Sparkles, Volume2, Activity } from 'lucide-react';

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [4, 3, 1, -1, -2, -1, 1, 3, 4, 5],
  Pop: [-2, -1, 1, 3, 4, 3, 1, -1, -2, -2],
  Jazz: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
  Classical: [4, 3, 2, 2, -1, -1, 0, 2, 3, 4],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  Vocal: [-3, -2, -1, 1, 3, 4, 4, 3, 1, -1],
  Electronic: [4, 3, 0, 0, -1, 2, 1, 0, 3, 4],
};

const BANDS = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

export const Equalizer: React.FC = () => {
  const { 
    eqEnabled, 
    eqGains, 
    eqPreset, 
    bassBoost, 
    compressorEnabled, 
    updateSetting 
  } = useSettingsStore();

  const [localGains, setLocalGains] = useState<number[]>(eqGains || Array(10).fill(0));
  const [customPresets, setCustomPresets] = useState<Record<string, number[]>>({});

  useEffect(() => {
    if (eqGains) {
      setLocalGains(eqGains);
    }
  }, [eqGains]);

  const handleBandChange = (index: number, val: number) => {
    const next = [...localGains];
    next[index] = val;
    setLocalGains(next);
    audioEngine.setEqBands(next);
    updateSetting('eqGains', next);
    updateSetting('eqPreset', 'Custom');
  };

  const handlePresetSelect = (name: string, gains: number[]) => {
    setLocalGains(gains);
    audioEngine.setEqBands(gains);
    updateSetting('eqGains', gains);
    updateSetting('eqPreset', name);
  };

  const toggleEq = () => {
    const nextState = !eqEnabled;
    updateSetting('eqEnabled', nextState);
    audioEngine.setEqEnabled(nextState);
  };

  const toggleCompressor = () => {
    const nextState = !compressorEnabled;
    updateSetting('compressorEnabled', nextState);
    audioEngine.setCompressorEnabled(nextState);
  };

  const handleBassBoostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    updateSetting('bassBoost', val);
    audioEngine.setBassBoost(val);
  };

  const resetFlat = () => {
    handlePresetSelect('Flat', PRESETS.Flat);
  };

  // Export current gains as a preset file
  const exportPreset = () => {
    const presetName = prompt('Enter a name for your custom preset:', 'My Custom Preset');
    if (!presetName) return;

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(
      JSON.stringify({ name: presetName, gains: localGains })
    );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${presetName.toLowerCase().replace(/\s+/g, '_')}_preset.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import preset file
  const importPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.name && Array.isArray(parsed.gains) && parsed.gains.length === 10) {
          handlePresetSelect(parsed.name, parsed.gains);
        } else {
          alert('Invalid preset file format. Must contain a name and an array of 10 gain values.');
        }
      } catch (err) {
        alert('Failed to parse preset file JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 tracking-wide text-sm">Equalizer & DSP Studio</h3>
            <p className="text-xs text-zinc-400">10-band studio frequency shaper and dynamic sound enhancements</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* EQ Bypass toggle */}
          <button
            onClick={toggleEq}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-200 border ${
              eqEnabled 
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.1)]' 
                : 'bg-zinc-800 text-zinc-400 border-white/5 hover:text-zinc-200'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${eqEnabled ? 'bg-purple-400 animate-pulse' : 'bg-zinc-500'}`} />
            {eqEnabled ? 'EQ ON' : 'EQ BYPASSED'}
          </button>
        </div>
      </div>

      {/* Preset bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-zinc-400 font-medium mr-2">Presets:</span>
        {Object.keys(PRESETS).map((pName) => {
          const isActive = eqPreset === pName;
          return (
            <button
              key={pName}
              onClick={() => handlePresetSelect(pName, PRESETS[pName])}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' 
                  : 'bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-zinc-200'
              }`}
            >
              {pName}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <button
            onClick={exportPreset}
            title="Export preset to file"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
          <label className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <Upload className="h-4 w-4" />
            <input type="file" accept=".json" onChange={importPreset} className="hidden" />
          </label>
          <button
            onClick={resetFlat}
            title="Reset flat"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Visual Response curve */}
      <div className="mb-6 rounded-xl border border-white/5 bg-zinc-950/40 p-4 relative overflow-hidden h-28">
        <div className="absolute inset-0 bg-radial-gradient from-purple-500/5 to-transparent pointer-events-none" />
        <div className="flex h-full w-full items-end justify-between relative z-10 px-4">
          {localGains.map((gain, i) => {
            const pct = ((gain + 12) / 24) * 100; // Map -12..+12 to 0..100%
            return (
              <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                {/* Horizontal line marker */}
                <div className="w-full border-b border-white/5 absolute top-1/2 left-0 pointer-events-none" />
                {/* Curve connecting dot */}
                <div 
                  className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] transition-all duration-300 absolute"
                  style={{ bottom: `calc(${pct}% - 3px)` }}
                />
              </div>
            );
          })}
          {/* Dynamic Frequency Line (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none px-4" viewBox="0 0 500 100" preserveAspectRatio="none">
            <path
              d={`M ${localGains.map((gain, idx) => {
                const x = (idx / 9) * 500;
                const y = 100 - ((gain + 12) / 24) * 100;
                return `${x} ${y}`;
              }).join(' L ')}`}
              fill="none"
              stroke="url(#purpleGlow)"
              strokeWidth="2.5"
              className="transition-all duration-300"
            />
            <defs>
              <linearGradient id="purpleGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="absolute bottom-1 right-2 flex items-center gap-1.5 opacity-30 text-[9px] font-mono tracking-widest text-zinc-400">
          <Activity className="h-3 w-3" />
          <span>ESTIMATED CURVE</span>
        </div>
      </div>

      {/* Gain Sliders Deck */}
      <div className="grid grid-cols-10 h-64 gap-2 md:gap-4 px-2 select-none relative mb-6">
        {localGains.map((gain, idx) => (
          <div key={idx} className="flex flex-col items-center justify-between h-full group">
            {/* Value Indicator */}
            <span className="text-[10px] font-mono font-medium text-zinc-400 group-hover:text-purple-400 transition-colors">
              {gain > 0 ? `+${gain}` : gain}dB
            </span>

            {/* Track container */}
            <div className="w-1.5 md:w-2 flex-1 rounded-full bg-zinc-950 border border-white/5 relative flex items-center justify-center my-3">
              {/* Active fill */}
              <div 
                className="w-full rounded-full bg-gradient-to-t from-purple-600 to-purple-400 absolute bottom-0 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                style={{ height: `${((gain + 12) / 24) * 100}%` }}
              />
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                disabled={!eqEnabled}
                value={gain}
                onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                style={{ transform: 'rotate(270deg)', writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
              />
            </div>

            {/* Band Title */}
            <span className="text-[9px] md:text-xs font-semibold text-zinc-500 font-mono tracking-tight">
              {BANDS[idx]}
            </span>
          </div>
        ))}
      </div>

      {/* Auxiliary FX Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/5 pt-6">
        {/* Bass Boost Slider */}
        <div className="rounded-xl bg-zinc-950/30 border border-white/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 mr-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
              <Volume2 className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-200 mb-1">
                <span>Sub-Bass Enhancement</span>
                <span className="font-mono text-pink-400">Level {bassBoost} / 10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={bassBoost}
                onChange={handleBassBoostChange}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Compressor Toggle */}
        <button
          onClick={toggleCompressor}
          className={`rounded-xl border p-4 text-left flex items-center justify-between transition-all duration-200 ${
            compressorEnabled 
              ? 'bg-purple-500/5 border-purple-500/20 shadow-[0_0_15px_rgba(147,51,234,0.05)]' 
              : 'bg-zinc-950/30 border-white/5 hover:border-white/10'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
              compressorEnabled ? 'bg-purple-500/10 text-purple-400' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-zinc-200">Studio Master Compressor</span>
              <span className="block text-[10px] text-zinc-400">Auto-gain normalization to prevent clipping and peak artifacts</span>
            </div>
          </div>
          <span className={`h-4 w-8 rounded-full flex items-center px-0.5 transition-all duration-300 ${
            compressorEnabled ? 'bg-purple-500 justify-end' : 'bg-zinc-800 justify-start'
          }`}>
            <span className="h-3 w-3 rounded-full bg-white shadow-md" />
          </span>
        </button>
      </div>
    </div>
  );
};
