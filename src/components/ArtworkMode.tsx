import React, { useState, useEffect, useRef } from 'react';
import { Track, Theme, ArtworkStyle, PlaybackState } from '../types';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Volume2, VolumeX,
  Minimize2, ListMusic, Music, Disc, RefreshCw, Layers, Sparkles, Check,
  Radio, Activity, EyeOff, Compass, Waves
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArtworkModeProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  analyser: AnalyserNode | null;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  activeTheme: Theme;
  onTogglePlaylist: () => void;
  onSwitchMode: () => void; // Go back to Spotify layout
}

export type WaveFormat = 'halo' | 'beams' | 'sine' | 'matrix' | 'none';

export default function ArtworkMode({
  currentTrack,
  playbackState,
  analyser,
  onTogglePlay,
  onPlayNext,
  onPlayPrev,
  onSeek,
  onSetVolume,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  activeTheme,
  onTogglePlaylist,
  onSwitchMode
}: ArtworkModeProps) {
  const [styleMode, setStyleMode] = useState<ArtworkStyle>('vinyl');
  const [waveFormat, setWaveFormat] = useState<WaveFormat>('halo');
  const [localSeekTime, setLocalSeekTime] = useState<number | null>(null);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showHint, setShowHint] = useState<boolean>(true);

  // Rotate angle selector
  const [rotateAngle, setRotateAngle] = useState(0);

  useEffect(() => {
    if (!playbackState.isPlaying) return;
    const interval = setInterval(() => {
      setRotateAngle(prev => (prev + 1.2) % 360);
    }, 16);
    return () => clearInterval(interval);
  }, [playbackState.isPlaying]);

  // Hide the interactive hint after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Audio time formats
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getEffectiveTime = () => {
    return localSeekTime !== null ? localSeekTime : playbackState.currentTime;
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSeekTime(parseFloat(e.target.value));
  };

  const handleSeekEnd = () => {
    if (localSeekTime !== null) {
      onSeek(localSeekTime);
      setLocalSeekTime(null);
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Determine if user clicked inside interactive component.
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [role="button"], a, select, textarea')) {
      return;
    }
    setShowControls(prev => !prev);
  };

  const styleOptions: { id: ArtworkStyle; label: string; icon: any }[] = [
    { id: 'vinyl', label: 'Classic Vinyl', icon: Disc },
    { id: 'prism', label: 'Neon Prism', icon: Sparkles },
    { id: 'hud', label: 'Digital HUD', icon: Layers },
    { id: 'ambient', label: 'Ambient Bloom', icon: RefreshCw },
    { id: 'cassette', label: 'Retro Cassette', icon: Music }
  ];

  const waveOptions: { id: WaveFormat; label: string; icon: any }[] = [
    { id: 'halo', label: 'Solar Halo', icon: Radio },
    { id: 'beams', label: 'Cyber Wings', icon: Activity },
    { id: 'sine', label: 'Luminous Sea', icon: Waves },
    { id: 'matrix', label: 'Data Rain', icon: Layers },
    { id: 'none', label: 'Clean Focus', icon: EyeOff }
  ];

  /* -------------------------------------------------------------
     HIGH FIDELITY CUSTOM WAVE CANVAS VISUALIZATION LOOP
  ------------------------------------------------------------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    // Matrix particles state
    const matrixDrops: { x: number; y: number; speed: number; length: number; opacity: number }[] = [];
    const dropCount = 50;
    for (let i = 0; i < dropCount; i++) {
      matrixDrops.push({
        x: Math.random(),
        y: Math.random() * -1, // start off-screen
        speed: 0.003 + Math.random() * 0.007,
        length: 25 + Math.random() * 45,
        opacity: 0.2 + Math.random() * 0.6
      });
    }

    // Solar halo particles
    const haloParticles: { angle: number; radiusOffset: number; speed: number; size: number }[] = [];
    for (let i = 0; i < 45; i++) {
      haloParticles.push({
        angle: Math.random() * Math.PI * 2,
        radiusOffset: Math.random() * 120,
        speed: 0.001 + Math.random() * 0.005,
        size: 0.8 + Math.random() * 1.6
      });
    }

    let frame = 0;

    const draw = () => {
      frame++;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      if (waveFormat === 'none') {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const cx = w / 2;
      const cy = h / 2;

      // Audio data extraction
      let isAudioActive = false;
      let dataArray = new Uint8Array(0);
      let bufferLength = 0;
      let averageAmp = 0;

      if (analyser && playbackState.isPlaying) {
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        isAudioActive = true;

        let total = 0;
        const count = Math.min(64, bufferLength);
        for (let i = 0; i < count; i++) {
          total += dataArray[i];
        }
        averageAmp = total / count;
      }

      // Fallback amplitude if not playing or suspended (simulates breathing rhythm)
      const finalAmp = isAudioActive ? averageAmp / 255 : (playbackState.isPlaying ? 0.35 + Math.sin(frame * 0.07) * 0.15 : 0.03);

      if (waveFormat === 'halo') {
        // RADIAL HALO SOLAR CROWN
        const baseRadius = Math.min(w, h) * 0.22 + (finalAmp * 20);
        ctx.shadowBlur = 15 + (finalAmp * 20);
        ctx.shadowColor = activeTheme.primary;

        // Draw radial spikes
        const beamsCount = 120;
        ctx.beginPath();
        for (let i = 0; i < beamsCount; i++) {
          const angle = (i / beamsCount) * Math.PI * 2 + (frame * 0.001);
          const bin = isAudioActive ? Math.min(Math.floor(i * (bufferLength / beamsCount) * 0.6), bufferLength - 1) : 0;
          const ampVal = isAudioActive ? dataArray[bin] / 255 : 0.2 + Math.sin((i * 0.12) + (frame * 0.04)) * 0.15;
          const len = baseRadius + (ampVal * 65);

          const sx = cx + Math.cos(angle) * baseRadius;
          const sy = cy + Math.sin(angle) * baseRadius;
          const ex = cx + Math.cos(angle) * len;
          const ey = cy + Math.sin(angle) * len;

          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
        }
        ctx.strokeStyle = activeTheme.primary;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner solid pulse Ring
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius - 6, 0, Math.PI * 2);
        ctx.strokeStyle = activeTheme.accent;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Solar halo dust particles circling
        ctx.shadowBlur = 0;
        ctx.fillStyle = activeTheme.primary;
        haloParticles.forEach(p => {
          p.angle += p.speed * (playbackState.isPlaying ? 1.6 : 0.2);
          const r = baseRadius + p.radiusOffset + (finalAmp * 25);
          const px = cx + Math.cos(p.angle) * r;
          const py = cy + Math.sin(p.angle) * r;
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
        });

      } else if (waveFormat === 'beams') {
        // Symmetric Cyber Wings spectrum laser bars on left & right
        const barsCount = 30;
        const spacing = 5;
        const barW = Math.max(3, (h * 0.65) / barsCount - spacing);
        const yStart = (h - (barsCount * (barW + spacing))) / 2;

        ctx.shadowBlur = 10;
        ctx.shadowColor = activeTheme.secondary;

        for (let i = 0; i < barsCount; i++) {
          const bin = isAudioActive ? Math.min(Math.floor(i * (bufferLength / barsCount) * 0.5), bufferLength - 1) : 0;
          const amp = isAudioActive ? dataArray[bin] / 255 : 0.12 + Math.sin(i * 0.3 - frame * 0.06) * 0.15;
          const barH = 15 + (amp * 180);

          const y = yStart + i * (barW + spacing);

          // Left wing bar
          const gradL = ctx.createLinearGradient(0, y, cx - 150, y);
          gradL.addColorStop(0, `${activeTheme.secondary}00`);
          gradL.addColorStop(1, activeTheme.secondary);
          ctx.fillStyle = gradL;
          ctx.beginPath();
          ctx.roundRect(cx - 150 - barH, y, barH, barW, 2);
          ctx.fill();

          // Right wing bar
          const gradR = ctx.createLinearGradient(cx + 150, y, w, y);
          gradR.addColorStop(0, activeTheme.secondary);
          gradR.addColorStop(1, `${activeTheme.secondary}00`);
          ctx.fillStyle = gradR;
          ctx.beginPath();
          ctx.roundRect(cx + 150, y, barH, barW, 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

      } else if (waveFormat === 'sine') {
        // Luminous flowing waves behind the artwork
        ctx.shadowBlur = 12;
        ctx.shadowColor = activeTheme.primary;
        ctx.lineWidth = 2.5;

        for (let waveIdx = 0; waveIdx < 3; waveIdx++) {
          const shift = waveIdx * Math.PI * 0.5 + (frame * 0.025);
          const coeffY = cy + (waveIdx * 12) - 12;
          
          ctx.beginPath();
          ctx.strokeStyle = waveIdx === 0 ? activeTheme.primary : (waveIdx === 1 ? activeTheme.accent : activeTheme.secondary);

          for (let x = 0; x < w; x += 4) {
            // Drop wave amplitude mathematically near center album frame
            const distFromCenter = Math.abs(x - cx);
            const mask = Math.min(1, Math.max(0, (distFromCenter - 130) / 160));
            const freqCoeff = 0.01 + (waveIdx * 0.002);
            const amp = (finalAmp * 90 + 20) * mask;
            const y = coeffY + Math.sin(x * freqCoeff + shift) * amp;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.shadowBlur = 0;

      } else if (waveFormat === 'matrix') {
        // Neo Cyber Rainfall cascading downward fading near center circle
        ctx.shadowBlur = 6;
        ctx.shadowColor = activeTheme.primary;

        matrixDrops.forEach(d => {
          d.y += d.speed * (1 + finalAmp * 2);
          if (d.y > 1) {
            d.y = -0.15;
            d.x = Math.random();
          }

          const dx = d.x * w;
          const dy = d.y * h;

          const distCover = Math.hypot(dx - cx, dy - cy);
          let itemOpacity = d.opacity;
          if (distCover < 160) {
            itemOpacity *= (distCover / 160); // screen center masking
          }

          if (itemOpacity > 0.02) {
            const grad = ctx.createLinearGradient(dx, dy, dx, dy + d.length);
            grad.addColorStop(0, `${activeTheme.primary}00`);
            grad.addColorStop(1, `${activeTheme.primary}${Math.floor(itemOpacity * 255).toString(16).padStart(2, '0')}`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(dx, dy + d.length);
            ctx.stroke();

            // Ripple reaction
            if (d.y + d.speed >= 0.98) {
              ctx.strokeStyle = `${activeTheme.accent}88`;
              ctx.beginPath();
              ctx.arc(dx, h - 3, 10 * finalAmp, 0, Math.PI, true);
              ctx.stroke();
            }
          }
        });
        ctx.shadowBlur = 0;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      ro.unobserve(canvas);
    };
  }, [analyser, playbackState.isPlaying, waveFormat, activeTheme]);

  return (
    <div 
      className="relative w-full h-full flex flex-col justify-between items-center p-6 overflow-hidden select-none cursor-pointer" 
      id="artwork-focus-root"
      onClick={handleBackgroundClick}
    >
      
      {/* 1. BACKGROUND ENGINE */}
      <div className="absolute inset-0 z-0 bg-[#060608] pointer-events-none transition-all duration-700">
        <AnimatePresence mode="wait">
          {currentTrack?.coverUrl && currentTrack.coverUrl !== 'synthwave' ? (
            <motion.div 
              key={currentTrack.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="absolute inset-0 bg-cover bg-center filter blur-[100px] scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${currentTrack.coverUrl})` }}
            />
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-tr from-purple-950/70 via-[#07070a] to-blue-950/40 filter blur-3xl pointer-events-none"
            />
          )}
        </AnimatePresence>
        {/* Deep light damping */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      </div>

      {/* REACTIVE HIGH-FIDELITY CANVAS WATERMARK */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-1" id="focus-visual-canvas" />

      {/* 2. HEADER: Dynamic collapsing header bar */}
      <header 
        className={`relative z-20 w-full flex flex-col lg:flex-row items-center justify-between gap-4 py-2.5 border-b border-white/5 bg-black/40 backdrop-blur-xl rounded-xl p-4 transition-all duration-500 ease-out ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-6 pointer-events-none'
        }`} 
        id="artwork-header"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onSwitchMode(); }}
            className="cursor-pointer text-xs font-mono font-bold tracking-wider px-3.5 py-2 rounded-lg border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white transition-all bg-zinc-900/90 hover:scale-[1.02] active:scale-[0.98]"
          >
            ← BACK TO DASHBOARD
          </button>
          
          <div className="hidden md:flex flex-col select-none">
            <span className="text-[9px] font-mono tracking-widest text-[#94a3b8]" style={{ color: activeTheme.secondary }}>
              FOCUS COCKPIT ACTIVE
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {styleOptions.find(o => o.id === styleMode)?.label}
            </span>
          </div>
        </div>

        {/* COMBINED SELECTOR SYSTEM */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 select-none" id="selector-box">
          
          {/* Cover Style selection */}
          <div className="flex flex-col items-center sm:items-start select-none">
            <span className="text-[9px] text-zinc-400 font-mono tracking-wider mb-1 uppercase">Sleeve Format</span>
            <div className="flex bg-zinc-950/85 rounded-lg p-0.5 border border-white/5 flex-wrap justify-center">
              {styleOptions.map(style => {
                const isSelected = style.id === styleMode;
                return (
                  <button
                    key={style.id}
                    onClick={(e) => { e.stopPropagation(); setStyleMode(style.id); }}
                    className={`cursor-pointer px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-150 flex items-center gap-1 ${
                      isSelected ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    style={isSelected ? { color: activeTheme.primary } : {}}
                  >
                    <style.icon size={11} />
                    <span>{style.label.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wave Format selection */}
          <div className="flex flex-col items-center sm:items-start select-none">
            <span className="text-[9px] text-zinc-400 font-mono tracking-wider mb-1 uppercase" style={{ color: activeTheme.secondary }}>Wave Soundwaves</span>
            <div className="flex bg-zinc-950/85 rounded-lg p-0.5 border border-white/5 flex-wrap justify-center">
              {waveOptions.map(wave => {
                const isSelected = wave.id === waveFormat;
                return (
                  <button
                    key={wave.id}
                    onClick={(e) => { e.stopPropagation(); setWaveFormat(wave.id); }}
                    className={`cursor-pointer px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-150 flex items-center gap-1 ${
                      isSelected ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                    style={isSelected ? { color: activeTheme.secondary } : {}}
                  >
                    <wave.icon size={11} />
                    <span>{wave.label.split(' ')[1] || wave.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </header>

      {/* 3. CENTERSTAGE: Rotating Artwork display with custom shapes */}
      <main className="relative z-10 flex-1 w-full flex items-center justify-center max-h-[60vh]" id="artwork-centerstage">
        
        {/* VINYL MODE */}
        {styleMode === 'vinyl' && (
          <div className="relative flex items-center h-full max-w-lg select-none" id="style-vinyl-container">
            {/* Spinning Black Vinyl Disk */}
            <motion.div 
              style={{ rotate: rotateAngle }}
              className="absolute left-1/3 md:left-1/2 w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-zinc-950 flex items-center justify-center shadow-2xl overflow-hidden border border-zinc-850 pointer-events-auto"
              id="vinyl-record"
            >
              {/* Record grooves */}
              <div className="absolute inset-1 border border-zinc-900/40 rounded-full" />
              <div className="absolute inset-3 border border-zinc-900/70 rounded-full" />
              <div className="absolute inset-6 border border-zinc-800/40 rounded-full" />
              <div className="absolute inset-10 border border-zinc-850/60 rounded-full" />
              <div className="absolute inset-14 border border-zinc-900/80 rounded-full" />
              <div className="absolute inset-20 border border-zinc-920/90 rounded-full" />

              {/* Center printed label (mini cover art) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-zinc-800 border-4 border-zinc-950 flex items-center justify-center relative shadow-inner">
                {currentTrack?.coverUrl === 'synthwave' ? (
                  <div className="w-full h-full bg-gradient-to-tr from-pink-600 to-cyan-500 animate-spin-slow" />
                ) : currentTrack?.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-slate-800" />
                )}
                {/* Center hole spindle */}
                <div className="absolute w-3 h-3 rounded-full bg-black/90 center-absolute border border-zinc-700 shadow-md" />
              </div>
            </motion.div>

            {/* Glowing Front Jacket Sleeve */}
            <motion.div 
              className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] border flex items-center justify-center bg-zinc-900 select-none z-10"
              style={{ borderColor: `${activeTheme.primary}33` }}
              id="vinyl-sleeve"
            >
              {currentTrack?.coverUrl === 'synthwave' ? (
                <div className="w-full h-full bg-linear-to-tr from-pink-600 via-purple-600 to-indigo-600 flex flex-col items-center justify-center p-6 text-center">
                  <Disc size={64} className="text-white/20 animate-spin-slow mb-4" />
                  <span className="text-sm font-sans font-bold text-white drop-shadow-md">PROCEDURAL RETRO</span>
                </div>
              ) : currentTrack?.coverUrl ? (
                <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Music size={64} className="text-zinc-650 animate-pulse" />
              )}
              {/* Cover outer glossy card glare */}
              <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
            </motion.div>
          </div>
        )}

        {/* NEON PRISM MODE */}
        {styleMode === 'prism' && (
          <div className="relative select-none flex items-center justify-center" id="style-prism-container">
            {/* Spinning digital neon particle dust rings around the art */}
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-dashed border-white/5 animate-spin-slow pointer-events-none" />
            <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-dotted border-white/5 animate-[spin_12s_linear_infinite_reverse] pointer-events-none" />

            <motion.div
              style={{ 
                rotateY: rotateAngle * 0.15, 
                rotateX: 12,
                borderColor: activeTheme.primary,
                boxShadow: `0 0 45px ${activeTheme.primary}44`
              }}
              className="relative w-52 h-52 sm:w-64 sm:h-64 rounded-xl overflow-hidden shadow-2xl border-2 flex items-center justify-center bg-zinc-950 pointer-events-auto"
              id="prism-jacket"
            >
              {currentTrack?.coverUrl === 'synthwave' ? (
                <div className="w-full h-full bg-linear-to-tr from-pink-600 via-purple-600 to-indigo-600" />
              ) : currentTrack?.coverUrl ? (
                <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="p-4 flex items-center justify-center text-slate-500 h-full"><Music size={40} /></div>
              )}
              {/* Ambient glass glare */}
              <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent" />
            </motion.div>
          </div>
        )}

        {/* HELICM HUD MODE */}
        {styleMode === 'hud' && (
          <div className="relative select-none flex flex-col items-center justify-center w-full max-w-sm h-full mt-2" id="style-hud-container">
            {/* Corner brackets overlay */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/20" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/20" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/20" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/20" />

            {/* Scrolling laser scan line */}
            <span className="absolute left-2 right-2 h-0.5 bg-current animate-[bounce_3.5s_infinite]" style={{ color: activeTheme.primary, boxShadow: `0 0 10px ${activeTheme.primary}` }} />

            {/* Dashboard diagnostic telemetry labels */}
            <div className="absolute left-4 top-4 font-mono text-[8px] text-zinc-550 space-y-1 select-none hidden sm:block">
              <p>[S_DECODING: ACTIVE]</p>
              <p>[BITRATE: {currentTrack?.bitrate || '320kb'}]</p>
              <p>[S_RATE: {currentTrack?.sampleRate || '44.1k'}]</p>
            </div>
            
            <div className="absolute right-4 bottom-4 font-mono text-[8px] text-zinc-550 space-y-1 select-none text-right hidden sm:block">
              <p>[CHANNELS: STEREO]</p>
              <p>[CORE_PCM: PCM32F]</p>
              <p>[LATENCY_B: GAPLESS]</p>
            </div>

            {/* Central framed cover */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 border border-white/10 rounded-lg overflow-hidden bg-black flex items-center justify-center p-2 relative">
              <div className="w-full h-full rounded-md overflow-hidden bg-zinc-900 border" style={{ borderColor: `${activeTheme.secondary}30` }}>
                {currentTrack?.coverUrl === 'synthwave' ? (
                  <div className="w-full h-full bg-linear-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center">
                    <Layers size={32} className="text-white/45 animate-pulse" />
                  </div>
                ) : currentTrack?.coverUrl ? (
                  <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover animate-[grow_10s_ease-in-out_infinite]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500"><Music size={32} /></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AMBIENT BLOOM MODE */}
        {styleMode === 'ambient' && (
          <div className="relative select-none flex items-center justify-center" id="style-ambient-container">
            <motion.div
              animate={{ rotate: playbackState.isPlaying ? 360 : 0 }}
              transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
              className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.85)] border flex items-center justify-center bg-zinc-900 pointer-events-auto"
              style={{ borderColor: `${activeTheme.primary}40`, boxShadow: `0 0 50px ${activeTheme.primary}33` }}
              id="ambient-wheel"
            >
              {currentTrack?.coverUrl === 'synthwave' ? (
                <div className="w-full h-full bg-linear-to-tr from-pink-600 via-purple-600 to-indigo-600" />
              ) : currentTrack?.coverUrl ? (
                <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="p-4 flex items-center justify-center text-slate-500 h-full"><Music size={40} /></div>
              )}
            </motion.div>
          </div>
        )}

        {/* TAPE CASSETTE MODE */}
        {styleMode === 'cassette' && (
          <div className="relative select-none flex items-center justify-center w-full max-w-sm sm:max-w-md h-full hover:scale-102 transition-transform duration-300" id="style-cassette-container">
            
            {/* Cassette background housing card */}
            <div className="w-72 h-44 sm:w-80 sm:h-48 rounded-xl bg-[#141416] border-2 border-zinc-800 shadow-2xl relative flex flex-col justify-between p-3 select-none" id="cassette-body">
              
              {/* Screw points */}
              <div className="absolute top-1 left-1.5 w-1 h-1 bg-zinc-650 rounded-full" />
              <div className="absolute top-1 right-1.5 w-1 h-1 bg-zinc-650 rounded-full" />
              <div className="absolute bottom-1.5 left-1.5 w-1 h-1 bg-zinc-650 rounded-full" />
              <div className="absolute bottom-1.5 right-1.5 w-1 h-1 bg-zinc-650 rounded-full" />

              {/* Tape Label */}
              <div className="flex-1 bg-neutral-100 rounded-lg p-2 flex flex-col justify-between overflow-hidden border border-zinc-950 relative leading-none text-black select-none">
                
                {/* Vintage stripes top */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-linear-to-r from-pink-500 via-orange-400 to-cyan-500 opacity-60 pointer-events-none" />

                <div className="flex justify-between items-start pt-2 relative z-10">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[10px] font-mono font-black tracking-tight truncate uppercase leading-none">
                      {currentTrack?.title || 'Unknown Title'}
                    </p>
                    <p className="text-[8px] font-sans font-bold text-zinc-600 truncate mt-1">
                      {currentTrack?.artist || 'Unknown Artist'}
                    </p>
                  </div>
                  
                  {/* Cassette mini preview of art */}
                  <div className="w-7 h-7 bg-zinc-900 rounded-sm border border-black overflow-hidden flex-shrink-0">
                    {currentTrack?.coverUrl === 'synthwave' ? (
                      <div className="w-full h-full bg-linear-to-tr from-pink-500 to-cyan-400" />
                    ) : currentTrack?.coverUrl ? (
                      <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-zinc-800" />
                    )}
                  </div>
                </div>

                {/* Central Spindle window */}
                <div className="mx-auto w-32 h-10 bg-zinc-950 rounded-md border-2 border-zinc-800 flex items-center justify-around relative my-auto">
                  {/* Spinning left gear wheel */}
                  <div className="relative w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center" id="reel-left">
                    <motion.div 
                      animate={playbackState.isPlaying ? { rotate: 360 } : {}}
                      transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="absolute w-full h-0.5 bg-zinc-600" />
                      <span className="absolute h-full w-0.5 bg-zinc-600" />
                    </motion.div>
                    <div className="w-3 h-3 rounded-full bg-zinc-900 z-10" />
                  </div>

                  <span className="text-[7px] font-mono text-zinc-600 select-none uppercase font-bold text-center">
                    NEONWAVE<br />90 MIN
                  </span>

                  {/* Spinning right gear wheel */}
                  <div className="relative w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center font-bold" id="reel-right">
                    <motion.div 
                      animate={playbackState.isPlaying ? { rotate: 360 } : {}}
                      transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 flex items-center justify-center font-bold"
                    >
                      <span className="absolute w-full h-0.5 bg-zinc-600" />
                      <span className="absolute h-full w-0.5 bg-zinc-600" />
                    </motion.div>
                    <div className="w-3 h-3 rounded-full bg-zinc-900 z-10" />
                  </div>
                </div>

                <div className="flex justify-between items-end text-[7px] font-mono font-bold pt-1 border-t border-zinc-300">
                  <span>DOLBY B/C NR</span>
                  <span>HI_RES LINE</span>
                  <span>SIDE A</span>
                </div>
              </div>

              {/* Bottom tape heads layout cutout */}
              <div className="mx-auto w-40 h-3 bg-neutral-950 rounded-t-sm border border-neutral-800 flex justify-around items-center px-4" />
            </div>
          </div>
        )}

      </main>

      {/* 4. FOOTER: Floating Controls overlay with collapsing animation */}
      <footer 
        className={`relative z-20 w-full max-w-xl bg-[#121215]/85 border border-white/5 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3 shadow-2xl transition-all duration-500 ease-out ${
          showControls ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'
        }`} 
        id="artwork-footer"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Track descriptions in focus mode */}
        <div className="flex flex-col text-center select-none" id="focus-meta-panel">
          <h2 className="text-sm font-sans font-bold text-white drop-shadow-md truncate">
            {currentTrack?.title || 'Unknown Title'}
          </h2>
          <p className="text-[11px] font-semibold mt-0.5 truncate" style={{ color: activeTheme.primary }}>
            {currentTrack?.artist || 'Unknown Artist'} &bull; <span className="text-zinc-400 font-normal">{currentTrack?.album || 'Local Library'}</span>
          </p>
        </div>

        {/* Center seeking layout */}
        <div className="flex items-center gap-3 w-full text-[10px] font-mono text-zinc-500 select-none" id="focus-timeline">
          <span>{formatTime(getEffectiveTime())}</span>
          <input
            type="range"
            min="0"
            max={playbackState.duration || 100}
            value={getEffectiveTime()}
            onChange={handleSeekChange}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="flex-grow h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer outline-none"
            style={{ accentColor: activeTheme.primary }}
          />
          <span>{formatTime(playbackState.duration)}</span>
        </div>

        {/* Master player actions */}
        <div className="flex items-center justify-between gap-4 mt-1 select-none" id="focus-action-row">
          
          {/* Left theme utility */}
          <div className="flex items-center gap-2" id="focus-vol">
            <button onClick={onToggleMute} className="cursor-pointer text-zinc-400 hover:text-white transition-colors" title="Mute">
              {playbackState.isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={playbackState.isMuted ? 0 : playbackState.volume}
              onChange={(e) => onSetVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: activeTheme.primary }}
            />
          </div>

          {/* Main remote actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleShuffle}
              className="cursor-pointer text-zinc-500 hover:text-white transition-colors"
              style={playbackState.isShuffle ? { color: activeTheme.accent } : {}}
              title="Shuffle"
            >
              <Shuffle size={13} />
            </button>
            <button
              onClick={onPlayPrev}
              className="cursor-pointer text-zinc-400 hover:text-white transition-colors"
              title="Prev Track"
            >
              <SkipBack size={15} />
            </button>

            {/* Huge Play button */}
            <button
              onClick={onTogglePlay}
              className="cursor-pointer w-10 h-10 rounded-full flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-lg"
              style={{ backgroundColor: activeTheme.primary }}
              title={playbackState.isPlaying ? 'Pause' : 'Play'}
            >
              {playbackState.isPlaying ? <Pause size={17} className="fill-black" /> : <Play size={17} className="fill-black ml-0.5" />}
            </button>

            <button
              onClick={onPlayNext}
              className="cursor-pointer text-zinc-400 hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward size={15} />
            </button>
            <button
              onClick={onToggleRepeat}
              className="cursor-pointer text-zinc-500 hover:text-white transition-colors"
              style={playbackState.isRepeat !== 'none' ? { color: activeTheme.secondary } : {}}
              title={`Repeat: ${playbackState.isRepeat}`}
            >
              <Repeat size={13} />
            </button>
          </div>

          {/* Library drawer trigger */}
          <button
            onClick={onTogglePlaylist}
            className="cursor-pointer text-zinc-400 hover:text-white p-1 rounded-md transition-all hover:bg-white/5 active:scale-95"
            title="Toggle Library Drawer"
          >
            <ListMusic size={15} />
          </button>
        </div>
      </footer>

      {/* 5. GENTLE INTRODUCTORY INTERACTION DISCOVERY TOAST */}
      <AnimatePresence>
        {showHint && showControls && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full border border-zinc-800 bg-[#0c0c0e]/95 text-zinc-400 text-[10px] font-mono tracking-wide pointer-events-none shadow-xl text-center flex items-center gap-2 select-none"
          >
            <Compass size={11} className="text-cyan-400 animate-spin-slow" />
            <span>Click empty space to toggle clean widescreen mode</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. CORNER CONTROLS RESTORE BUTTON */}
      <AnimatePresence>
        {!showControls && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5, scale: 1 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => { e.stopPropagation(); setShowControls(true); }}
            className="absolute bottom-6 right-6 z-30 p-2.5 rounded-full border border-white/10 bg-black/70 text-zinc-400 hover:text-white backdrop-blur-md flex items-center gap-1.5 text-[10px] font-mono select-none cursor-pointer shadow-lg outline-none"
            id="floating-restore-controls"
            title="Restore UI overlays"
          >
            <Layers size={11} className="animate-pulse" />
            <span>RESTORE INTERFACE</span>
          </motion.button>
        )}
      </AnimatePresence>

    </div>
  );
}
