/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useToastStore } from '../common/Toast';
import { Cpu, Power, Settings, Plus, Star, Palette, Sparkles, FileAudio } from 'lucide-react';

interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'visualizer' | 'lyrics' | 'theme' | 'extension';
  enabled: boolean;
  config: Record<string, any>;
}

const INITIAL_PLUGINS: PluginDescriptor[] = [
  {
    id: 'nebula_vis',
    name: 'Nebula Aura Visualizer',
    version: '1.2.0',
    author: 'Hormonix Labs',
    description: 'Renders a beautiful, reactive space nebula cloud that moves to sub-bass sub-frequencies.',
    category: 'visualizer',
    enabled: true,
    config: { density: 100, blur: true }
  },
  {
    id: 'lrc_karaoke',
    name: 'Karaoke Synced Highlights',
    version: '2.0.1',
    author: 'Symphony Devs',
    description: 'Enables real-time word-by-word karaoke bouncing ball highlighting for LRC lyrics.',
    category: 'lyrics',
    enabled: false,
    config: { followBall: true, style: 'glow' }
  },
  {
    id: 'synth_carbon_theme',
    name: 'OLED Carbon Retro Theme',
    version: '1.0.0',
    author: 'Aesthetic Studios',
    description: 'Applies deep carbon grids, neon glow highlights, and vector CRT oscilloscope borders.',
    category: 'theme',
    enabled: false,
    config: { gridLines: true, crtScanlines: false }
  },
  {
    id: 'sleep_timer',
    name: 'Smart Sleep Scheduler',
    version: '1.1.0',
    author: 'Hormonix Labs',
    description: 'Fades down volume and pauses playback automatically after a scheduled period of inactivity.',
    category: 'extension',
    enabled: true,
    config: { duration: 30 }
  }
];

export const PluginsView: React.FC = () => {
  const [plugins, setPlugins] = useState<PluginDescriptor[]>(() => {
    // Read enabled plugins from useSettingsStore if available, otherwise use defaults
    const saved = useSettingsStore.getState().pluginsEnabled || [];
    return INITIAL_PLUGINS.map(p => ({
      ...p,
      enabled: saved.includes(p.id) ? true : p.enabled
    }));
  });

  const { updateSetting } = useSettingsStore();
  const { showToast } = useToastStore();
  const [selectedPlugin, setSelectedPlugin] = useState<PluginDescriptor | null>(null);

  const togglePlugin = (id: string) => {
    const next = plugins.map((p) => {
      if (p.id === id) {
        const nextState = !p.enabled;
        showToast(
          nextState ? `Plugin "${p.name}" initialized` : `Plugin "${p.name}" deactivated`,
          'success'
        );
        return { ...p, enabled: nextState };
      }
      return p;
    });

    setPlugins(next);

    // Persist to store
    const enabledIds = next.filter(p => p.enabled).map(p => p.id);
    updateSetting('pluginsEnabled', enabledIds);
    
    // Dynamically apply visualizer updates if we enable nebula
    if (id === 'nebula_vis') {
      const p = next.find(x => x.id === 'nebula_vis');
      if (p?.enabled) {
        updateSetting('visualizerStyle', 'nebula');
      } else {
        updateSetting('visualizerStyle', 'bars');
      }
    }
  };

  const handleInstallPlugin = () => {
    const url = prompt('Enter the package URL or repository link of the plugin:', 'https://plugins.hormonix.audio/registry/3d-canvas-oscilloscope');
    if (!url) return;
    showToast('Connecting to plugin repository...', 'success');
    
    setTimeout(() => {
      showToast('Plugin "3D Canvas Oscilloscope" downloaded and installed successfully!', 'success');
      setPlugins(prev => [
        ...prev,
        {
          id: 'three_osc',
          name: '3D Canvas Oscilloscope',
          version: '1.0.0',
          author: 'Independent Creator',
          description: 'Uses WebGL to render an immersive 3D spatial ribbon mapping physical waves.',
          category: 'visualizer',
          enabled: true,
          config: { zoom: 1 }
        }
      ]);
    }, 1500);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-6 backdrop-blur-md h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 tracking-wide text-sm">Extensible Plugin Manager</h3>
            <p className="text-xs text-zinc-400">Enhance your player with custom audio pipelines, lyrics crawlers, visualizers, and layouts</p>
          </div>
        </div>

        <button
          onClick={handleInstallPlugin}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-500/15 transition-all self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          Install Plugin
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto xl:overflow-hidden">
        {/* Plugins List (Left) */}
        <div className="xl:col-span-2 xl:overflow-y-auto overflow-visible pr-1 space-y-3 custom-scrollbar">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              onClick={() => setSelectedPlugin(plugin)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                selectedPlugin?.id === plugin.id
                  ? 'bg-purple-500/5 border-purple-500/30'
                  : 'bg-zinc-950/25 border-white/5 hover:border-white/10 hover:bg-zinc-950/40'
              } flex items-center justify-between gap-4`}
            >
              <div className="flex items-start gap-3 overflow-hidden">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg mt-0.5 ${
                  plugin.category === 'visualizer' ? 'bg-indigo-500/10 text-indigo-400' :
                  plugin.category === 'lyrics' ? 'bg-pink-500/10 text-pink-400' :
                  plugin.category === 'theme' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {plugin.category === 'theme' ? <Palette className="h-4.5 w-4.5" /> : <Cpu className="h-4.5 w-4.5" />}
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-200">{plugin.name}</span>
                    <span className="text-[9px] font-mono font-medium text-zinc-500 bg-zinc-900 rounded px-1.5 py-0.5">
                      v{plugin.version}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate mt-1 leading-relaxed">{plugin.description}</p>
                  <span className="text-[9px] font-mono text-zinc-500 mt-1.5 block font-semibold uppercase tracking-wide">
                    By {plugin.author} • {plugin.category.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Toggle switch */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlugin(plugin.id);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                  plugin.enabled
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                    : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'
                }`}
                title={plugin.enabled ? "Deactivate plugin" : "Activate plugin"}
              >
                <Power className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Plugin configuration (Right) */}
        <div className="rounded-xl border border-white/5 bg-zinc-950/20 p-5 flex flex-col justify-between xl:h-full h-auto overflow-hidden">
          {selectedPlugin ? (
            <div className="flex flex-col h-full justify-between">
              <div>
                <h4 className="font-semibold text-xs text-zinc-200 flex items-center gap-2 border-b border-white/5 pb-3">
                  <Settings className="h-4 w-4 text-purple-400 animate-spin-slow" />
                  Configure: {selectedPlugin.name}
                </h4>

                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase font-mono tracking-wide">Description</span>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{selectedPlugin.description}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase font-mono tracking-wide">Settings</span>
                    <div className="mt-2 space-y-3 bg-zinc-950/40 p-3 rounded-lg border border-white/5">
                      {Object.keys(selectedPlugin.config).map((key) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="font-mono text-zinc-400">{key}</span>
                          {typeof selectedPlugin.config[key] === 'boolean' ? (
                            <input
                              type="checkbox"
                              checked={selectedPlugin.config[key]}
                              onChange={() => {
                                showToast('Plugin configuration updated', 'success');
                              }}
                              className="accent-purple-500 cursor-pointer h-3.5 w-3.5 rounded"
                            />
                          ) : (
                            <input
                              type="number"
                              defaultValue={selectedPlugin.config[key]}
                              className="bg-zinc-900 border border-white/10 rounded px-2 py-0.5 w-16 text-center text-zinc-200 font-mono"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-6">
                <span>STATUS: {selectedPlugin.enabled ? 'ACTIVE' : 'INACTIVE'}</span>
                <span>SANDBOX SECURE</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-12">
              <Sparkles className="h-8 w-8 mb-2 opacity-50 text-purple-400" />
              <span className="text-xs">Select a plugin to configure its details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
