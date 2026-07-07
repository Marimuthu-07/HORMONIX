/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Minus, Square, X, Music4 } from 'lucide-react';
import { isElectron, ipcService } from '../../electron/ipcService';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    if (isElectron()) {
      ipcService.send('window-minimize');
    } else {
      console.log('[TitleBar] Simulated minimize');
    }
  };

  const handleMaximize = () => {
    if (isElectron()) {
      ipcService.send('window-maximize');
    } else {
      console.log('[TitleBar] Simulated maximize');
    }
  };

  const handleClose = () => {
    if (isElectron()) {
      ipcService.send('window-close');
    } else {
      console.log('[TitleBar] Simulated close');
    }
  };

  return (
    <div 
      className="flex h-11 w-full select-none items-center justify-between border-b border-white/5 bg-zinc-950/90 px-4 text-zinc-300 backdrop-blur-md"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400">
          <Music4 className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-zinc-100 uppercase">
          HORMONIX
        </span>
      </div>

      {/* Window Controls */}
      <div 
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all duration-150"
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all duration-150"
          title="Maximize"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-red-600/80 text-zinc-400 hover:text-white transition-all duration-150"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
