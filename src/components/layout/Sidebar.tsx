/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Music, 
  Disc, 
  Users, 
  ListMusic, 
  Heart, 
  History, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Home as HomeIcon
} from 'lucide-react';
import { useAppStore, ActiveView } from '../../store/useAppStore';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { activeView, setView } = useAppStore();

  const menuItems = [
    { view: 'home' as ActiveView, label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
    { view: 'library' as ActiveView, label: 'Library', icon: <Music className="h-5 w-5" /> },
    { view: 'albums' as ActiveView, label: 'Albums', icon: <Disc className="h-5 w-5" /> },
    { view: 'artists' as ActiveView, label: 'Artists', icon: <Users className="h-5 w-5" /> },
    { view: 'playlists' as ActiveView, label: 'Playlists', icon: <ListMusic className="h-5 w-5" /> },
    { view: 'favorites' as ActiveView, label: 'Favorites', icon: <Heart className="h-5 w-5" /> },
    { view: 'history' as ActiveView, label: 'History', icon: <History className="h-5 w-5" /> },
    { view: 'settings' as ActiveView, label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex h-full flex-col justify-between border-r border-white/5 bg-zinc-950/80 p-3 backdrop-blur-xl"
    >
      <div>
        {/* Clickable HORMONIX Logo to toggle collapse */}
        <div 
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 px-3 py-2.5 mb-6 cursor-pointer hover:bg-white/5 rounded-xl transition-all duration-150"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white shadow-lg shadow-purple-600/20 flex-shrink-0">
            <Music className="h-5 w-5" />
          </div>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-black tracking-wider text-zinc-100 font-sans"
            >
              HORMONIX
            </motion.span>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = activeView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`relative flex h-11 w-full items-center gap-4 rounded-xl px-3 text-left transition-all duration-200 ${
                  isActive 
                    ? 'text-purple-400 font-semibold bg-purple-500/10' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
                }`}
                id={`sidebar-item-${item.view}`}
              >
                {/* Visual indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-2 h-7 w-1 rounded-r-lg bg-gradient-to-b from-purple-500 to-pink-500"
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  />
                )}
                
                <span className={`transition-colors duration-200 ${isActive ? 'text-purple-400' : ''}`}>
                  {item.icon}
                </span>

                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="text-sm tracking-wide"
                  >
                    {item.label}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </motion.div>
  );
};
