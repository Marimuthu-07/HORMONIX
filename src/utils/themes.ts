import { Theme } from '../types';

export const PresetThemes: Theme[] = [
  {
    id: 'cyber-neon',
    name: 'NEONWAVE Cyber',
    primary: '#ff007f',      // Neon pink
    secondary: '#00f0ff',    // Neon cyan
    accent: '#ffdd00',       // Cyberpunk yellow
    glow: 'shadow-[0_0_15px_rgba(255,0,127,0.5)]',
    bg: 'from-slate-950 via-zinc-950 to-slate-900',
    card: 'bg-slate-900/60 border-pink-500/10 focus-within:border-pink-500/30',
    text: 'text-zinc-100',
    textMuted: 'text-zinc-400',
    border: 'border-pink-500/20',
    canvasFilter: 'hue-rotate(0deg)'
  },
  {
    id: 'sunset-blvd',
    name: 'Sunset Boulevard',
    primary: '#ff5e62',      // Coral pink
    secondary: '#ff9966',    // Warm orange
    accent: '#8a2be2',       // Violet
    glow: 'shadow-[0_0_15px_rgba(255,94,98,0.5)]',
    bg: 'from-purple-950 via-stone-955 to-slate-950',
    card: 'bg-purple-950/40 border-orange-500/10 focus-within:border-orange-500/30',
    text: 'text-slate-100',
    textMuted: 'text-slate-400',
    border: 'border-orange-500/20',
    canvasFilter: 'hue-rotate(30deg)'
  },
  {
    id: 'matrix',
    name: 'Matrix Hack',
    primary: '#00ff41',      // Hacker green
    secondary: '#008f11',    // Dark green
    accent: '#00ff41',       // High bright green
    glow: 'shadow-[0_0_15px_rgba(0,255,65,0.4)]',
    bg: 'from-black via-neutral-950 to-stone-950',
    card: 'bg-stone-900/40 border-green-500/10 focus-within:border-green-500/40',
    text: 'text-green-100',
    textMuted: 'text-green-500/70',
    border: 'border-green-500/20',
    canvasFilter: 'hue-rotate(120deg)'
  },
  {
    id: 'glacial-aurora',
    name: 'Glacial Aurora',
    primary: '#00f7ff',      // Cyan ice
    secondary: '#00ff9d',    // Neon green-blue
    accent: '#ff00aa',       // Contrasting hot pink
    glow: 'shadow-[0_0_15px_rgba(0,247,255,0.4)]',
    bg: 'from-cyan-950 via-slate-955 to-zinc-950',
    card: 'bg-slate-900/50 border-cyan-500/10 focus-within:border-cyan-500/30',
    text: 'text-cyan-50',
    textMuted: 'text-cyan-400/60',
    border: 'border-cyan-500/20',
    canvasFilter: 'hue-rotate(180deg)'
  },
  {
    id: 'amber-gold',
    name: 'Amber Gold',
    primary: '#ffaa00',      // Gold amber
    secondary: '#ff5500',    // Flame orange
    accent: '#00e5ff',       // Cyber cyan
    glow: 'shadow-[0_0_15px_rgba(255,170,0,0.4)]',
    bg: 'from-neutral-950 via-stone-950 to-neutral-900',
    card: 'bg-neutral-900/60 border-amber-500/10 focus-within:border-amber-500/30',
    text: 'text-amber-50',
    textMuted: 'text-amber-500/50',
    border: 'border-amber-500/20',
    canvasFilter: 'hue-rotate(240deg)'
  },
  {
    id: 'velvet-night',
    name: 'Velvet Indigo',
    primary: '#b026ff',      // Hot violet
    secondary: '#4d4dff',    // Neon blue
    accent: '#ff007f',       // Hot pink
    glow: 'shadow-[0_0_15px_rgba(176,38,255,0.4)]',
    bg: 'from-indigo-950 via-zinc-950 to-stone-950',
    card: 'bg-indigo-950/30 border-purple-500/10 focus-within:border-purple-500/30',
    text: 'text-violet-50',
    textMuted: 'text-violet-400/60',
    border: 'border-purple-500/20',
    canvasFilter: 'hue-rotate(300deg)'
  }
];
