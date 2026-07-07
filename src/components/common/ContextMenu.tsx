/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ContextMenuOption {
  label: string;
  icon: React.ReactNode;
  action: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, options, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  // Adjust coordinates if menu goes off screen
  const menuWidth = 200;
  const menuHeight = options.length * 36 + 12;
  const adjustedX = window.innerWidth - x < menuWidth ? x - menuWidth : x;
  const adjustedY = window.innerHeight - y < menuHeight ? y - menuHeight : y;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: adjustedY, left: adjustedX }}
        className="fixed z-50 min-w-[200px] rounded-xl border border-white/10 bg-zinc-950/80 p-1.5 shadow-2xl backdrop-blur-xl"
        id="context-menu"
      >
        {options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => {
              opt.action();
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-150 ${
              opt.danger
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-zinc-200 hover:bg-white/10'
            }`}
          >
            <span className="opacity-70">{opt.icon}</span>
            <span className="font-medium">{opt.label}</span>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
};
