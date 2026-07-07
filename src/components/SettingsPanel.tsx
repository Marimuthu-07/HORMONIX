import React, { useState, useEffect } from 'react';
import { Theme } from '../types';
import { 
  Settings, Sliders, Check, RefreshCw, User, Sparkles, Volume2, ShieldAlert,
  SlidersHorizontal, Radio, Activity, Palette, Compass, Waves
} from 'lucide-react';

interface SettingsPanelProps {
  themes: Theme[];
  activeTheme: Theme;
  onSelectTheme: (themeId: string) => void;
  gaplessEnabled: boolean;
  onSetGaplessEnabled: (enabled: boolean) => void;
  crossfadeDuration: number;
  onSetCrossfadeDuration: (duration: number) => void;
}

export default function SettingsPanel({
  themes,
  activeTheme,
  onSelectTheme,
  gaplessEnabled,
  onSetGaplessEnabled,
  crossfadeDuration,
  onSetCrossfadeDuration
}: SettingsPanelProps) {
  const [userName, setUserName] = useState<string>('Audio Wanderer');

  // Load username
  useEffect(() => {
    const saved = localStorage.getItem('neonwave_username');
    if (saved) setUserName(saved);
  }, []);

  const handleSaveUserName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    localStorage.setItem('neonwave_username', userName.trim());
    window.dispatchEvent(new Event('username_updated'));
  };

  const handleResetApp = () => {
    if (confirm('A WARNING: Reset all application states, themes, custom playlists, and imported folders from localStorage? This reverts NeonWave back to factory initial state.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-3xl select-none" id="neonwave-settings-console">
      
      {/* 1. SECTOR A: SYSTEM USER PROFILE */}
      <div className="bg-zinc-900/10 border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row gap-5 items-center justify-between" id="settings-pnl-user">
        <div className="flex items-center gap-4 text-center sm:text-left min-w-0">
          <div className="w-14 h-14 rounded-full bg-linear-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center border border-white/10 shadow-lg text-white font-black font-sans text-lg">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1">
              <Sparkles size={10} className="text-amber-500 animate-pulse" />
              <span>STEREOPHONIC PROFILE</span>
            </span>
            <h3 className="text-base font-bold text-white leading-normal truncate">{userName}</h3>
            <p className="text-[10.5px] text-zinc-500">Managing synchronized host assets & decibel outputs</p>
          </div>
        </div>

        <form onSubmit={handleSaveUserName} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Edit display name..."
            className="bg-zinc-950 font-sans border border-white/5 hover:border-white/10 focus:border-violet-500 rounded-lg py-1.5 px-3 text-xs text-zinc-200 outline-none w-full sm:w-44 focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="submit"
            className="cursor-pointer bg-white text-zinc-950 text-xs font-bold font-sans py-1.5 px-4 rounded-lg hover:bg-zinc-200 active:scale-95 transition-all outline-none"
            style={{ backgroundColor: activeTheme.primary, color: '#000000' }}
          >
            Apply
          </button>
        </form>
      </div>

      {/* 2. SECTOR B: ENGINE AUDIO PARAMETERS */}
      <div className="bg-zinc-900/10 border border-white/5 rounded-2xl p-4 md:p-5 space-y-4" id="settings-pnl-engine">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Sliders/ >
          <span>DSP CROSS-MIX ENGINE</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          {/* Toggle gapless */}
          <div className="space-y-2 bg-black/20 p-4 border border-white/[0.02] rounded-xl flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Waves size={13} className="text-[#00e5ff]" style={{ color: activeTheme.secondary }} />
                <span>Seamless Gapless Playback</span>
              </h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Pre-renders upcoming music tracks in a parallel background stream, allowing sample-accurate gapless transit.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-900/80 pt-3 mt-1.5">
              <span className="text-[10.5px] text-zinc-400 font-mono">Status: {gaplessEnabled ? 'ACTIVE EQ' : 'DISABLED'}</span>
              <button
                type="button"
                onClick={() => onSetGaplessEnabled(!gaplessEnabled)}
                className={`cursor-pointer w-10 h-5 rounded-full p-0.5 transition-all outline-none ${
                  gaplessEnabled ? 'bg-[#ff4d9d]' : 'bg-zinc-800'
                }`}
                style={gaplessEnabled ? { backgroundColor: activeTheme.accent } : {}}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${
                  gaplessEnabled ? 'translate-x-[20px]' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Slider crossfade */}
          <div className="space-y-2 bg-black/20 p-4 border border-white/[0.02] rounded-xl flex flex-col justify-between">
            <div className="space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-[#00e5ff]" style={{ color: activeTheme.secondary }} />
                <span>Overlap Crossfade Interval</span>
              </h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Applies a linear gain volume fade-out/fade-in curve to overlap songs smoothly.
              </p>
            </div>
            <div className="space-y-1 border-t border-zinc-900/80 pt-3 mt-1.5">
              <div className="flex justify-between text-[10.5px] text-zinc-400 font-mono mb-1">
                <span>Duration</span>
                <span className="text-[#00e5ff]" style={{ color: activeTheme.secondary }}>{crossfadeDuration}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="1"
                value={crossfadeDuration}
                onChange={(e) => onSetCrossfadeDuration(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer outline-none"
                style={{ accentColor: activeTheme.secondary }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTOR C: SKIN AND THEMES OPTIONS */}
      <div className="bg-zinc-900/10 border border-white/5 rounded-2xl p-4 md:p-5 space-y-4" id="settings-pnl-themes">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
          <Palette size={14} style={{ color: activeTheme.primary }} />
          <span>NEONWAVE COGNITIVE SKINS</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="skins-matrix">
          {themes.map((t) => {
            const isActive = t.id === activeTheme.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTheme(t.id)}
                className={`cursor-pointer bg-zinc-950/40 hover:bg-zinc-900/40 rounded-xl p-3 border-2 transition-all flex flex-col justify-between min-h-[90px] relative overflow-hidden group ${
                  isActive ? 'border-white scale-[1.01]' : 'border-white/5 hover:border-white/10'
                }`}
                style={isActive ? { borderColor: t.primary } : {}}
              >
                {/* Visual Backdrop Color Circles */}
                <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 bg-linear-to-tl" style={{ backgroundImage: `linear-gradient(135deg, ${t.primary}, ${t.secondary}, ${t.accent})` }} />

                <div className="flex items-center justify-between z-10">
                  <span className="text-xs font-bold text-white group-hover:text-white transition-colors">{t.name}</span>
                  {isActive && <Check size={11} className="text-[#00e5ff]" style={{ color: t.secondary }} />}
                </div>

                <div className="flex gap-1.5 items-center mt-3 z-10 select-none">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.primary }} />
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.secondary }} />
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: t.accent }} />
                  <span className="text-[9px] font-mono text-zinc-500 ml-1">Color Set</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SECTOR D: SYSTEM CRITICAL OVERRIDES */}
      <div className="bg-zinc-950 border border-red-950/30 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between" id="settings-pnl-override">
        <div className="flex items-center gap-3 text-center sm:text-left">
          <ShieldAlert size={18} className="text-rose-500 animate-pulse flex-shrink-0" />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-rose-400 uppercase">FACTORY RESET RESTORATIONS</h4>
            <p className="text-[10px] text-zinc-500">Flush all local caches, customized structures, folders, and reload clean workspace</p>
          </div>
        </div>

        <button
          onClick={handleResetApp}
          className="cursor-pointer bg-[#ff4d9d]/10 hover:bg-[#ff4d9d]/15 border border-[#ff4d9d]/15 hover:border-[#ff4d9d]/30 text-[#ff4d9d] font-bold py-1.5 px-4 rounded-lg text-xs transition-colors outline-none"
        >
          Reset Application
        </button>
      </div>

    </div>
  );
}
