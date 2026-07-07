/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SongList } from './SongList';
import { FolderBrowser } from './FolderBrowser';
import { SmartLibrary } from './SmartLibrary';
import { DuplicatesAndRepair } from './DuplicatesAndRepair';
import { PluginsView } from './Plugins';
import { PerformanceDashboard } from '../layout/PerformanceDashboard';
import { Song } from '../../types';
import { Music, FolderClosed as FolderMusic, Sparkles, ShieldCheck, Cpu, Library, HelpCircle } from 'lucide-react';

interface LibraryCommandCenterProps {
  songs: Song[];
  onSongDeleted?: () => void;
}

type LibraryTab = 'all_songs' | 'folders' | 'smart_collections' | 'diagnostics' | 'plugins' | 'performance';

export const LibraryCommandCenter: React.FC<LibraryCommandCenterProps> = ({ songs, onSongDeleted }) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all_songs');

  const tabs = [
    { id: 'all_songs' as LibraryTab, label: 'All Tracks', icon: <Music className="h-4 w-4" /> },
    { id: 'folders' as LibraryTab, label: 'Folder Browser', icon: <FolderMusic className="h-4 w-4" /> },
    { id: 'smart_collections' as LibraryTab, label: 'Smart Collections', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'diagnostics' as LibraryTab, label: 'Diagnostics & Repair', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'plugins' as LibraryTab, label: 'Extensions & Plugins', icon: <Cpu className="h-4 w-4" /> },
    { id: 'performance' as LibraryTab, label: 'Performance Profiler', icon: <Cpu className="h-4 w-4" /> },
  ];

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'all_songs':
        return <SongList songs={songs} onSongDeleted={onSongDeleted} />;
      case 'folders':
        return <FolderBrowser />;
      case 'smart_collections':
        return <SmartLibrary />;
      case 'diagnostics':
        return <DuplicatesAndRepair />;
      case 'plugins':
        return <PluginsView />;
      case 'performance':
        return <PerformanceDashboard />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Dynamic Sub-header Navigation strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-white/5 bg-zinc-950/20 px-6 py-2 flex-shrink-0 gap-3">
        <div className="flex items-center gap-2">
          <Library className="h-4.5 w-4.5 text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Library Control Center</span>
        </div>

        {/* Horizontal Scrollable Tabs on mobile, grouped nicely on desktop */}
        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap border ${
                  isActive
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic tab contents viewport */}
      <div className="flex-1 overflow-y-auto md:p-6 p-2 custom-scrollbar">
        {renderActiveTabContent()}
      </div>
    </div>
  );
};
