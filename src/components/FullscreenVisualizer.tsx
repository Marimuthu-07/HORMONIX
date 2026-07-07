import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Track, Theme, PlaybackState } from '../types';
import { 
  X, Play, Pause, SkipForward, SkipBack, Heart, Settings, Sliders, Volume2, 
  VolumeX, SlidersHorizontal, Maximize2, Minimize2, ListMusic, Music, Palette, HelpCircle, Save, Sparkles, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FullscreenVisualizerProps {
  currentTrack: Track | null;
  playbackState: PlaybackState;
  analyser: AnalyserNode | null;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onPlayPrev: () => void;
  onSeek: (time: number) => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  theme: Theme;
  onClose: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  playlist?: Track[];
  onSelectTrack?: (index: number) => void;
}

export type FullscreenMode = 
  | 'aura'      // Mode 1: Aura Ring
  | 'spectrum'  // Mode 2: Spectrum Wave
  | 'particles' // Mode 3: Particle Universe
  | 'nebula'    // Mode 4: Nebula Space
  | 'energy'    // Mode 5: Circular Energy
  | 'quantum'   // Mode 6: RGB Quantum (Spectrum Wave + Circular Energy with RGB)
  | 'cinematic';// Mode 7: Cinematic large blur

interface VisualizerConfig {
  id: string;
  name: string;
  waveColor: 'primary' | 'secondary' | 'accent' | 'white';
  glowStrength: number; // 0 to 40
  particleCount: number; // 10 to 300
  artSize: 'small' | 'medium' | 'large' | 'hidden';
  animationSpeed: number; // 0.5 to 2.0
  backgroundBlur: number; // 0 to 30
  fpsLimit: 30 | 60;
}

const DEFAULT_CONFIGS: Record<FullscreenMode, VisualizerConfig> = {
  aura: { id: 'aura', name: 'Aura Ring', waveColor: 'primary', glowStrength: 25, particleCount: 50, artSize: 'medium', animationSpeed: 1.0, backgroundBlur: 10, fpsLimit: 60 },
  spectrum: { id: 'spectrum', name: 'Spectrum Wave', waveColor: 'primary', glowStrength: 15, particleCount: 40, artSize: 'medium', animationSpeed: 1.2, backgroundBlur: 8, fpsLimit: 60 },
  particles: { id: 'particles', name: 'Particle Universe', waveColor: 'accent', glowStrength: 30, particleCount: 180, artSize: 'medium', animationSpeed: 1.5, backgroundBlur: 5, fpsLimit: 60 },
  nebula: { id: 'nebula', name: 'Nebula Space', waveColor: 'primary', glowStrength: 25, particleCount: 120, artSize: 'medium', animationSpeed: 0.7, backgroundBlur: 20, fpsLimit: 60 },
  energy: { id: 'energy', name: 'Circular Energy', waveColor: 'accent', glowStrength: 35, particleCount: 80, artSize: 'medium', animationSpeed: 1.3, backgroundBlur: 10, fpsLimit: 60 },
  quantum: { id: 'quantum', name: 'RGB Quantum', waveColor: 'accent', glowStrength: 32, particleCount: 80, artSize: 'medium', animationSpeed: 1.4, backgroundBlur: 12, fpsLimit: 60 },
  cinematic: { id: 'cinematic', name: 'Cinematic Cinema', waveColor: 'primary', glowStrength: 20, particleCount: 50, artSize: 'large', animationSpeed: 0.8, backgroundBlur: 25, fpsLimit: 60 }
};

export default function FullscreenVisualizer({
  currentTrack,
  playbackState,
  analyser,
  onTogglePlay,
  onPlayNext,
  onPlayPrev,
  onSeek,
  onSetVolume,
  onToggleMute,
  theme,
  onClose,
  isFavorited,
  onToggleFavorite,
  playlist = [],
  onSelectTrack
}: FullscreenVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const artworkRef = useRef<HTMLDivElement | null>(null);
  const artworkRotationRef = useRef<number>(0);

  const [showPlaylist, setShowPlaylist] = useState(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  
  // Immersive state settings
  const [activeMode, setActiveMode] = useState<FullscreenMode>('aura');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showInfoOverlay, setShowInfoOverlay] = useState<boolean>(false);

  // Load custom visualizer configuration state from localStorage
  const [config, setConfig] = useState<VisualizerConfig>(() => {
    const saved = localStorage.getItem('neonwave_visualizer_config_aura');
    if (saved) {
      try { return JSON.parse(saved); } catch(_) {}
    }
    return DEFAULT_CONFIGS.aura;
  });

  // Keep configs per mode
  useEffect(() => {
    const saved = localStorage.getItem(`neonwave_visualizer_config_${activeMode}`);
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
        return;
      } catch(_) {}
    }
    setConfig(DEFAULT_CONFIGS[activeMode]);
  }, [activeMode]);

  // Save the customized preset
  const [isSavedNotify, setIsSavedNotify] = useState(false);
  const handleSaveConfig = () => {
    localStorage.setItem(`neonwave_visualizer_config_${activeMode}`, JSON.stringify(config));
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2000);
  };

  // Reset to default
  const handleResetConfig = () => {
    setConfig(DEFAULT_CONFIGS[activeMode]);
  };

  // Auto-hide controls upon mouse stillness
  useEffect(() => {
    if (!showControls) return;
    const handleMouseStill = () => {
      // Setup reset timer
    };

    let timer: NodeJS.Timeout;
    const resetTimer = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        // Only hide if settings dialog is not open
        if (!showSettings) {
          setShowControls(false);
        }
      }, 3000); // 3 seconds stillness standard
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      clearTimeout(timer);
    };
  }, [showSettings]);

  // Audio analyzer dynamic parameters
  const isPlaying = playbackState.isPlaying;

  // Particle pool instantiation
  const particles = useMemo(() => {
    const pArray: Array<{ x: number; y: number; z: number; size: number; speed: number; angle: number }> = [];
    for (let i = 0; i < 300; i++) {
      pArray.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        z: Math.random() * 0.9 + 0.1,
        size: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 0.01 + 0.002,
        angle: Math.random() * Math.PI * 2
      });
    }
    return pArray;
  }, []);

  // Frame Rendering core loop inside requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    const targetFpsMs = 1000 / config.fpsLimit;

    // Physics markers for professional audio analyzer peak drops
    const barPeaks: number[] = new Array(300).fill(0);
    const barPeakDropDelay: number[] = new Array(300).fill(0);

    // Fluid responsive layout resizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    // Color mapper based on configuration
    const getHexColor = () => {
      if (config.waveColor === 'primary') return theme.primary;
      if (config.waveColor === 'secondary') return theme.secondary;
      if (config.waveColor === 'accent') return theme.accent;
      return '#ffffff';
    };

    // Nebula cloud points setup
    const cloudPoints: Array<{ x: number; y: number; size: number; phase: number; speed: number }> = [];
    for (let i = 0; i < 8; i++) {
      cloudPoints.push({
        x: Math.random() * 400 - 200,
        y: Math.random() * 400 - 200,
        size: Math.random() * 150 + 100,
        phase: Math.random() * Math.PI,
        speed: (Math.random() * 0.001 + 0.0003) * config.animationSpeed
      });
    }

    // Liquid waves dynamic factors
    let liquidPhase = 0;

    const render = (now: number) => {
      animId = requestAnimationFrame(render);

      // Enforce FPS regulation limits
      const delta = now - lastTime;
      if (delta < targetFpsMs) return;
      lastTime = now - (delta % targetFpsMs);

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const cx = width / 2;
      const cy = height / 2;

      // Extract raw audio data
      const bufferLength = analyser ? analyser.frequencyBinCount : 128;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Uint8Array(bufferLength);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData);
        analyser.getByteTimeDomainData(timeData);
      } else {
        // Procedural generator
        const timeFactor = now * 0.003;
        for (let i = 0; i < bufferLength; i++) {
          freqData[i] = Math.max(0, 50 + Math.sin(i * 0.1 - timeFactor) * 40 + Math.cos(i * 0.04 + timeFactor * 0.5) * 20);
          timeData[i] = 128 + Math.sin(i * 0.3 + timeFactor) * 15;
        }
      }

      // Calculate localized spectrum frequency segment metrics (Bass, Mid, Treble)
      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;
      for (let i = 0; i < 15; i++) bassSum += freqData[i];
      for (let i = 15; i < 60; i++) midSum += freqData[i];
      for (let i = 60; i < 120; i++) trebleSum += freqData[i];

      const bassAvg = (bassSum / 15) / 255;
      const midAvg = (midSum / 45) / 255;
      const trebleAvg = (trebleSum / 60) / 255;
      const systemAmp = (bassAvg * 0.5 + midAvg * 0.3 + trebleAvg * 0.2);

      // Assign distinct vibrant modes color mappings
      let primaryColor = getHexColor();
      let secondaryColor = theme.secondary;
      let accentColor = theme.accent;

      if (activeMode === 'aura') {
        primaryColor = '#00f2fe';     // Neon Teal
        secondaryColor = '#4facfe';   // Indigo Wave
        accentColor = '#bc00dd';      // Deep Hot Violet
      } else if (activeMode === 'spectrum') {
        primaryColor = '#ff416c';     // Cyber Orange-Pink
        secondaryColor = '#ff4b2b';   // Neon Orange
        accentColor = '#e100ff';      // Neon Purple
      } else if (activeMode === 'particles') {
        primaryColor = '#00ffcc';     // Turquoise Spark
        secondaryColor = '#ff00ff';   // Magenta Star
        accentColor = '#ffea00';      // Super Gold
      } else if (activeMode === 'nebula') {
        primaryColor = '#a855f7';     // Deep Purple Cosmic
        secondaryColor = '#ec4899';   // Nebula Pink
        accentColor = '#3b82f6';      // Starry Azure
      } else if (activeMode === 'energy') {
        primaryColor = '#ff0055';     // Flame Pink/Red
        secondaryColor = '#ffaa00';   // Blazing Yellow-Orange
        accentColor = '#ffea00';      // Solar Burst Gold
      } else if (activeMode === 'cinematic') {
        primaryColor = '#f43f5e';     // Velvet Strawberry
        secondaryColor = '#fda4af';   // Peach Sunset
        accentColor = '#fdec0a';      // Solar Gold
      } else if (activeMode === 'quantum') {
        const hue = (now * 0.04) % 360;
        primaryColor = hslToHex(hue, 100, 55);
        secondaryColor = hslToHex((hue + 120) % 360, 100, 55);
        accentColor = hslToHex((hue + 240) % 360, 100, 55);
      }

      // Live 60fps responsive album artwork animations (slower rotation)
      if (isPlaying) {
        artworkRotationRef.current += (0.05 + bassAvg * 0.15);
      }

      if (artworkRef.current) {
        const scale = 1 + bassAvg * 0.12; // stable pulses up to 1.12
        const rotateDeg = (artworkRotationRef.current % 360);
        
        artworkRef.current.style.transform = `scale(${scale}) rotate(${rotateDeg}deg)`;
      }

      // ────────────────────────────────────────────────────────────
      // DRAW CANVAS BACKGROUNDS based on active modes
      // ────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, width, height);

      if (activeMode === 'minimal') {
        // Pure deep obsidian flat space
        ctx.fillStyle = '#010204';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Default glowing cosmic dark vignette
        const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(width, height) * 0.95);
        grad.addColorStop(0, '#0c101d');
        grad.addColorStop(0.4, '#070a13');
        grad.addColorStop(1, '#020306');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // ────────────────────────────────────────────────────────────
      // EXTENDED VISUALIZER MODES IMPLEMENTATION
      // ────────────────────────────────────────────────────────────

      // MODAL 1: Aura Ring
      if (activeMode === 'aura') {
        const radius = Math.min(width, height) * 0.2 + bassAvg * 35;
        ctx.shadowBlur = config.glowStrength * (1 + bassAvg * 0.5);
        ctx.shadowColor = primaryColor;

        // Reactive Aura Waves
        ctx.beginPath();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = primaryColor;
        for (let i = 0; i < 100; i++) {
          const angle = (i / 100) * Math.PI * 2;
          const dataIdx = Math.floor(i * (bufferLength / 100) * 0.5);
          const val = (freqData[dataIdx] / 255) * 60;
          const r = radius + val;
          const rx = cx + Math.cos(angle) * r;
          const ry = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();

        // Overlay glowing orbit spots
        ctx.shadowBlur = 0;
        ctx.fillStyle = accentColor;
        for (let i = 0; i < 5; i++) {
          const angle = (now * 0.0005 * config.animationSpeed + i * (Math.PI * 2 / 5));
          const rx = cx + Math.cos(angle) * (radius - 12);
          const ry = cy + Math.sin(angle) * (radius - 12);
          ctx.beginPath();
          ctx.arc(rx, ry, 3.5 + trebleAvg * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // MODAL 2: Aurora Flow
      else if (activeMode === 'aurora') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const numWaves = 4;
        
        for (let wave = 0; wave < numWaves; wave++) {
          const step = now * 0.0007 * config.animationSpeed + wave * 50;
          ctx.beginPath();
          const pCol = wave % 2 === 0 ? primaryColor : secondaryColor;
          ctx.strokeStyle = `${pCol}38`;
          ctx.lineWidth = 30 + wave * 10;
          ctx.shadowBlur = config.glowStrength + 15;
          ctx.shadowColor = pCol;

          for (let x = 0; x < width; x += 15) {
            const index = Math.floor((x / width) * (bufferLength * 0.5));
            const yOffset = (freqData[index] / 255) * 110 * Math.sin(x * 0.004 + step);
            const y = cy + (wave - 1.5) * 130 + yOffset;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.bezierCurveTo(x - 7.5, y - yOffset * 0.2, x - 5, y, x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      // MODAL 3: Spectrum Wave
      else if (activeMode === 'spectrum') {
        const barCount = Math.min(80, config.particleCount || 80);
        const barWidth = (width / barCount) * 0.72;
        const spacing = (width / barCount) * 0.28;
        
        ctx.shadowBlur = config.glowStrength * 0.8;
        ctx.shadowColor = primaryColor;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength / barCount) * 0.65);
          const heightFactor = (freqData[dataIndex] / 255) * height * 0.58;
          const barHeight = Math.max(6, heightFactor);

          // Peak fall-off algorithm with gravitational deceleration
          if (barHeight > barPeaks[i]) {
            barPeaks[i] = barHeight;
            barPeakDropDelay[i] = 15; // hold peak for 15 frames
          } else {
            if (barPeakDropDelay[i] > 0) {
              barPeakDropDelay[i]--;
            } else {
              barPeaks[i] -= 1.8; // gradual gravity fall
              if (barPeaks[i] < 0) barPeaks[i] = 0;
            }
          }

          const x = i * (barWidth + spacing) + spacing / 2;

          // Main 3D multi-layered neon bar gradient
          const grad = ctx.createLinearGradient(x, height, x, height - barHeight);
          grad.addColorStop(0, `${primaryColor}11`);
          grad.addColorStop(0.3, `${primaryColor}bb`);
          grad.addColorStop(0.7, secondaryColor);
          grad.addColorStop(1, accentColor);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // High-fidelity glowing peak indicators
          if (barPeaks[i] > 2) {
            const peakY = height - barPeaks[i] - 5;
            const peakGrad = ctx.createLinearGradient(x, peakY, x, peakY + 3);
            peakGrad.addColorStop(0, '#ffffff');
            peakGrad.addColorStop(1, accentColor);
            
            ctx.save();
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 12;
            ctx.fillStyle = peakGrad;
            ctx.beginPath();
            ctx.roundRect(x, peakY, barWidth, 3, 1.5);
            ctx.fill();
            ctx.restore();
          }

          // Subtle neon floor reflection trail
          const reflOpacity = 0.08 + (freqData[dataIndex] / 255) * 0.12;
          const reflGrad = ctx.createLinearGradient(x, height, x, height + barHeight * 0.4);
          reflGrad.addColorStop(0, `rgba(255, 255, 255, ${reflOpacity})`);
          reflGrad.addColorStop(0.4, `${primaryColor}22`);
          reflGrad.addColorStop(1, 'transparent');
          
          ctx.fillStyle = reflGrad;
          ctx.beginPath();
          ctx.roundRect(x, height, barWidth, barHeight * 0.4, [0, 0, 4, 4]);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }

      // MODAL 4: Particle Universe
      else if (activeMode === 'particles') {
        const count = Math.min(config.particleCount, 220);
        ctx.shadowBlur = config.glowStrength * 0.4;
        ctx.shadowColor = primaryColor;
        
        particles.slice(0, count).forEach(p => {
          // Dynamic warp speed map
          const currentSpeed = p.speed * config.animationSpeed * (1 + systemAmp * 3.8);
          
          // Save prior depth positions for drawing realistic motion blur paths
          const prevZ = p.z;
          p.z -= currentSpeed;
          
          // Orbital spatial vortex spiral
          p.angle += 0.007 * (1 + bassAvg * 1.5);

          if (p.z <= 0.01) {
            p.z = 1.0;
            p.x = Math.random() * 2 - 1;
            p.y = Math.random() * 2 - 1;
            p.angle = Math.random() * Math.PI * 2;
          }

          // Projection coordinate calculations (with spiral rotation offset)
          const cosAngle = Math.cos(p.angle);
          const sinAngle = Math.sin(p.angle);
          
          const prevCos = Math.cos(p.angle - 0.007 * (1 + bassAvg * 1.5));
          const prevSin = Math.sin(p.angle - 0.007 * (1 + bassAvg * 1.5));

          const pRotX = p.x * cosAngle - p.y * sinAngle;
          const pRotY = p.x * sinAngle + p.y * cosAngle;

          const prevRotX = p.x * prevCos - p.y * prevSin;
          const prevRotY = p.x * prevSin + p.y * prevCos;

          const depthX = cx + (pRotX * cx) / p.z;
          const depthY = cy + (pRotY * cy) / p.z;

          const prevDepthX = cx + (prevRotX * cx) / prevZ;
          const prevDepthY = cy + (prevRotY * cy) / prevZ;

          const radius = (p.size / p.z) * (1 + bassAvg * 0.9);

          if (depthX >= 0 && depthX <= width && depthY >= 0 && depthY <= height) {
            // Draw warp speed flow lines (motion blur trails)
            ctx.beginPath();
            ctx.moveTo(prevDepthX, prevDepthY);
            ctx.lineTo(depthX, depthY);
            
            const trailAlpha = Math.min(1, (1.2 - p.z));
            ctx.strokeStyle = p.z < 0.38 
              ? `rgba(255, 255, 255, ${trailAlpha})` 
              : p.z < 0.65 
                ? `rgba(${hexToRgb(accentColor)}, ${trailAlpha * 0.85})`
                : `rgba(${hexToRgb(primaryColor)}, ${trailAlpha * 0.5})`;
            
            ctx.lineWidth = Math.max(0.6, radius * 0.6);
            ctx.stroke();

            // Core particle star head
            ctx.beginPath();
            ctx.arc(depthX, depthY, Math.max(0.7, radius), 0, Math.PI * 2);
            ctx.fillStyle = p.z < 0.38 ? '#ffffff' : p.z < 0.68 ? accentColor : primaryColor;
            ctx.fill();

            // Beautiful cross-hair cosmic star flare on deep bass frequencies
            if (p.z < 0.32 && bassAvg > 0.64) {
              ctx.save();
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              // Horizontal streak
              ctx.moveTo(depthX - radius * 3.5, depthY);
              ctx.lineTo(depthX + radius * 3.5, depthY);
              // Vertical streak
              ctx.moveTo(depthX, depthY - radius * 3.5);
              ctx.lineTo(depthX, depthY + radius * 3.5);
              ctx.stroke();
              ctx.restore();
            }
          }
        });
        ctx.shadowBlur = 0;
      }

      // MODAL 5: Nebula
      else if (activeMode === 'nebula') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        cloudPoints.forEach((cp, idx) => {
          cp.phase += cp.speed;
          const bassBoost = bassAvg * 45;
          const x = cx + cp.x + Math.sin(cp.phase) * 60;
          const y = cy + cp.y + Math.cos(cp.phase * 0.8) * 60;
          const size = cp.size * (1 + systemAmp * 0.15) + bassBoost;

          const cloudGrad = ctx.createRadialGradient(x, y, 5, x, y, size);
          const colHex = idx % 2 === 0 ? primaryColor : accentColor;
          cloudGrad.addColorStop(0, `${colHex}44`);
          cloudGrad.addColorStop(0.5, `${colHex}15`);
          cloudGrad.addColorStop(1, 'transparent');

          ctx.fillStyle = cloudGrad;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        });

        // Twinkling stars in the background triggered by treble frequencies
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 40; i++) {
          const starX = Math.abs(Math.sin(i * 91238)) * width;
          const starY = Math.abs(Math.cos(i * 12345)) * height;
          const brightness = Math.max(0.2, (Math.sin(now * 0.005 + i) + 1.0) * 0.3 + trebleAvg * 0.6);
          ctx.globalAlpha = brightness;
          ctx.beginPath();
          ctx.arc(starX, starY, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
      }

      // MODAL 6: Minimal Mono
      else if (activeMode === 'minimal') {
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0; // strict minimal

        const step = width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v - 1.0) * 100 + cy;
          const x = i * step;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // MODAL 7: Ambient Flow (No artwork)
      else if (activeMode === 'ambient') {
        const baseRadius = Math.min(width, height) * 0.25;
        ctx.save();
        ctx.lineWidth = 4;
        ctx.shadowBlur = config.glowStrength * 1.5;
        ctx.shadowColor = secondaryColor;

        ctx.beginPath();
        ctx.strokeStyle = `${secondaryColor}22`;
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Glowing organic sweep curves
        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          const flowStep = now * 0.0006 * config.animationSpeed + w * (Math.PI / 3);
          ctx.beginPath();
          ctx.strokeStyle = w === 1 ? primaryColor : w === 2 ? accentColor : secondaryColor;
          ctx.globalAlpha = 0.5;
          ctx.shadowBlur = config.glowStrength;

          for (let i = 0; i < 70; i++) {
            const angle = (i / 70) * Math.PI * 2;
            const dataIdx = Math.floor(i * (bufferLength / 70) * 0.6);
            const val = (freqData[dataIdx] / 255) * 85 * Math.sin(angle * 3 + flowStep);
            const r = baseRadius + val;
            const rx = cx + Math.cos(angle) * r;
            const ry = cy + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      // MODAL 8: Circular Energy
      else if (activeMode === 'energy') {
        const energyRadius = Math.min(width, height) * 0.17 + bassAvg * 30;
        const totalBeams = 160;
        ctx.shadowBlur = config.glowStrength * (1 + bassAvg * 0.5);
        ctx.shadowColor = accentColor;
        ctx.lineWidth = 1.3;

        // 1. Ambient Strobe / Full-canvas color pulse on powerful bass beats
        if (bassAvg > 0.65) {
          ctx.save();
          const strobeGrad = ctx.createRadialGradient(cx, cy, energyRadius, cx, cy, Math.max(width, height) * 0.95);
          const flashPower = (bassAvg - 0.6) * 0.45;
          strobeGrad.addColorStop(0, `rgba(${hexToRgb(accentColor)}, ${flashPower})`);
          strobeGrad.addColorStop(0.5, `rgba(${hexToRgb(primaryColor)}, ${flashPower * 0.25})`);
          strobeGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = strobeGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(width, height), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 2. Rotating Colorful Disco Laser Spotlights sweeping across background
        ctx.save();
        const laserCount = 6;
        const beamSweepAngle = now * 0.0004 * config.animationSpeed;
        for (let s = 0; s < laserCount; s++) {
          const angle = beamSweepAngle + (s * Math.PI * 2) / laserCount;
          // Spotlight beam width dynamically expands with mid frequencies
          const beamWidth = 0.18 + midAvg * 0.15;
          const beamLength = Math.max(width, height) * 0.95;
          
          const laserGrad = ctx.createRadialGradient(cx, cy, energyRadius, cx, cy, beamLength);
          const col = s % 3 === 0 ? primaryColor : s % 3 === 1 ? secondaryColor : accentColor;
          laserGrad.addColorStop(0, `rgba(${hexToRgb(col)}, ${0.18 + trebleAvg * 0.15})`);
          laserGrad.addColorStop(0.4, `rgba(${hexToRgb(col)}, 0.05)`);
          laserGrad.addColorStop(1, 'transparent');
          
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, beamLength, angle - beamWidth, angle + beamWidth);
          ctx.closePath();
          ctx.fillStyle = laserGrad;
          ctx.fill();
        }
        ctx.restore();

        // 3. Draw volumetric inner reactor core halo
        ctx.save();
        const coreRadGrad = ctx.createRadialGradient(cx, cy, energyRadius * 0.4, cx, cy, energyRadius + 18);
        coreRadGrad.addColorStop(0, `rgba(${hexToRgb(accentColor)}, 0.2)`);
        coreRadGrad.addColorStop(0.5, `rgba(${hexToRgb(primaryColor)}, 0.1)`);
        coreRadGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreRadGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, energyRadius + 18, 0, Math.PI * 2);
        ctx.fill();

        // Reactor boundary ring
        ctx.shadowBlur = config.glowStrength;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, energyRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4. Shimmering retro 3D perspective Disco dancefloor grid
        ctx.save();
        const gridYPos = height * 0.68;
        // draw vertical perspective columns
        const gridCols = 16;
        for (let col = 0; col <= gridCols; col++) {
          const ratio = col / gridCols;
          const startX = width * 0.2 + ratio * width * 0.6;
          const endX = ratio * width;
          ctx.strokeStyle = `rgba(${hexToRgb(col % 2 === 0 ? primaryColor : secondaryColor)}, ${0.07 + bassAvg * 0.1})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(startX, gridYPos);
          ctx.lineTo(endX, height);
          ctx.stroke();
        }
        // draw horizontal row lines pulsing with bass energy
        const gridRows = 10;
        for (let row = 0; row <= gridRows; row++) {
          const progress = row / gridRows;
          const y = gridYPos + progress * (height - gridYPos);
          ctx.strokeStyle = `rgba(${hexToRgb(row % 3 === 0 ? accentColor : primaryColor)}, ${0.06 + bassAvg * 0.14})`;
          ctx.lineWidth = 1.0 + progress * 1.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
        ctx.restore();

        // 5. Segmented Disco Neon Ring with pulsing pieces
        ctx.save();
        const ringSegments = 24;
        const ringAngleOffset = -now * 0.0006 * config.animationSpeed;
        ctx.shadowBlur = 20;
        ctx.shadowColor = primaryColor;
        for (let j = 0; j < ringSegments; j++) {
          const startAngle = ringAngleOffset + (j * Math.PI * 2) / ringSegments;
          const endAngle = startAngle + (Math.PI * 2) / ringSegments * 0.72; // space between segments
          const radiusWithPulse = energyRadius * 1.1 + Math.cos(j * 3 + now * 0.004) * 8 * midAvg;
          
          ctx.strokeStyle = j % 3 === 0 ? accentColor : j % 3 === 1 ? primaryColor : secondaryColor;
          ctx.lineWidth = 3.5 + bassAvg * 4.5; // thumps thick with bass thumps
          ctx.beginPath();
          ctx.arc(cx, cy, radiusWithPulse, startAngle, endAngle);
          ctx.stroke();
        }
        ctx.restore();

        // 6. Plasma discharge energy beams
        for (let i = 0; i < totalBeams; i++) {
          const angle = (i / totalBeams) * Math.PI * 2;
          const dataVal = freqData[Math.floor((i % (totalBeams / 2)) * (bufferLength / (totalBeams / 2)) * 0.72)];
          const beamLen = (dataVal / 255) * 165 * (0.4 + bassAvg * 0.6);

          // Add beautiful high-fidelity plasma wave ripple
          const plasmaRipple = Math.sin(angle * 32 + now * 0.009) * 4 * trebleAvg;
          const finalAngle = angle + plasmaRipple * 0.01;

          const startX = cx + Math.cos(angle) * (energyRadius + 2);
          const startY = cy + Math.sin(angle) * (energyRadius + 2);
          const endX = cx + Math.cos(finalAngle) * (energyRadius + beamLen);
          const endY = cy + Math.sin(finalAngle) * (energyRadius + beamLen);

          ctx.strokeStyle = i % 2 === 0 ? accentColor : primaryColor;
          ctx.lineWidth = i % 4 === 0 ? 2.0 : 0.8;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // MODAL 9: Liquid Flow
      else if (activeMode === 'liquid') {
        liquidPhase += 0.012 * config.animationSpeed;
        ctx.save();
        ctx.shadowBlur = config.glowStrength;
        ctx.shadowColor = secondaryColor;

        const numLayers = 3;
        for (let layer = 0; layer < numLayers; layer++) {
          ctx.beginPath();
          ctx.fillStyle = layer === 0 ? `${secondaryColor}15` : layer === 1 ? `${primaryColor}22` : `${accentColor}33`;
          
          ctx.moveTo(0, height);
          for (let x = 0; x <= width; x += 40) {
            const dataIdx = Math.floor((x / width) * (bufferLength * 0.5));
            const amp = (freqData[dataIdx] / 255) * 80;
            const y = cy + 100 + layer * 40 + Math.sin(x * 0.003 + liquidPhase + layer) * 50 * (1 + bassAvg) + amp;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      }

      // MODAL 10: Cinematic Large Blur
      else if (activeMode === 'cinematic') {
        // Floating cinematic lines behind
        ctx.lineWidth = 2.0;
        ctx.shadowBlur = config.glowStrength * 1.8;
        ctx.shadowColor = primaryColor;
        ctx.strokeStyle = primaryColor;

        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v - 1.0) * 140 * (1 + bassAvg) + cy;
          const x = (i / bufferLength) * width;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // MODAL 11: Quantum Spectrum (Spectrum Wave + Circular Energy with RGB)
      else if (activeMode === 'quantum') {
        const energyRadius = Math.min(width, height) * 0.16 + bassAvg * 28;
        const totalBeams = 120;
        
        // 1. DISCO LASER SPOTLIGHTS SWEEPING BACKGROUND (with RGB Cycling!)
        ctx.save();
        const laserCount = 5;
        const beamSweepAngle = now * 0.0003 * config.animationSpeed;
        for (let s = 0; s < laserCount; s++) {
          const angle = beamSweepAngle + (s * Math.PI * 2) / laserCount;
          const beamWidth = 0.22 + midAvg * 0.12;
          const beamLength = Math.max(width, height) * 1.0;
          
          const laserGrad = ctx.createRadialGradient(cx, cy, energyRadius, cx, cy, beamLength);
          const col = s % 3 === 0 ? primaryColor : s % 3 === 1 ? secondaryColor : accentColor;
          laserGrad.addColorStop(0, `rgba(${hexToRgb(col)}, ${0.25 + trebleAvg * 0.2})`);
          laserGrad.addColorStop(0.5, `rgba(${hexToRgb(col)}, 0.08)`);
          laserGrad.addColorStop(1, 'transparent');
          
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, beamLength, angle - beamWidth, angle + beamWidth);
          ctx.closePath();
          ctx.fillStyle = laserGrad;
          ctx.fill();
        }
        ctx.restore();

        // 2. SPECTRUM EQUALIZER BARS AT THE BOTTOM
        ctx.save();
        const barCount = 64; 
        const barWidth = (width / barCount) * 0.75;
        const spacing = (width / barCount) * 0.25;
        ctx.shadowBlur = config.glowStrength * 0.6;
        ctx.shadowColor = accentColor;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor(i * (bufferLength / barCount) * 0.65);
          const heightFactor = (freqData[dataIndex] / 255) * height * 0.42;
          const barHeight = Math.max(5, heightFactor);

          // Peaks falloff
          if (barHeight > barPeaks[i]) {
            barPeaks[i] = barHeight;
            barPeakDropDelay[i] = 12;
          } else {
            if (barPeakDropDelay[i] > 0) {
              barPeakDropDelay[i]--;
            } else {
              barPeaks[i] -= 2.2;
              if (barPeaks[i] < 0) barPeaks[i] = 0;
            }
          }

          const x = i * (barWidth + spacing) + spacing / 2;
          
          // Shimming rainbow gradient for the bars
          const grad = ctx.createLinearGradient(x, height, x, height - barHeight);
          grad.addColorStop(0, `${primaryColor}15`);
          grad.addColorStop(0.4, `${primaryColor}aa`);
          grad.addColorStop(0.8, secondaryColor);
          grad.addColorStop(1, accentColor);

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Elegant peak dots
          if (barPeaks[i] > 2) {
            const peakY = height - barPeaks[i] - 4;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = accentColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x + barWidth / 2, peakY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();

        // 3. CENTRED COGNITIVE CIRCULAR ENERGY REACTOR
        ctx.save();
        ctx.shadowBlur = config.glowStrength * (1 + bassAvg * 0.4);
        ctx.shadowColor = primaryColor;
        ctx.lineWidth = 1.2;

        // Volumetric glow core
        const coreRadGrad = ctx.createRadialGradient(cx, cy, energyRadius * 0.4, cx, cy, energyRadius + 18);
        coreRadGrad.addColorStop(0, `rgba(${hexToRgb(primaryColor)}, 0.18)`);
        coreRadGrad.addColorStop(0.5, `rgba(${hexToRgb(accentColor)}, 0.08)`);
        coreRadGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreRadGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, energyRadius + 18, 0, Math.PI * 2);
        ctx.fill();

        // Core border ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(cx, cy, energyRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Concentric expanding shockwave rings on heavy bass beats
        if (bassAvg > 0.68) {
          const ringScale = 1.0 + (now * 0.003 % 0.8);
          ctx.strokeStyle = `rgba(${hexToRgb(accentColor)}, ${1 - (ringScale - 1.0) / 0.8})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, energyRadius * ringScale, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Plasma spectrum-guided discharge beams wrapping around energy core
        for (let i = 0; i < totalBeams; i++) {
          const angle = (i / totalBeams) * Math.PI * 2;
          const dataVal = freqData[Math.floor((i % (totalBeams / 2)) * (bufferLength / (totalBeams / 2)) * 0.72)];
          const beamLen = (dataVal / 255) * 140 * (0.45 + bassAvg * 0.55);

          // Beautiful plasma wave ripple 
          const wavePeriod = Math.sin(angle * 24 + now * 0.008) * 3 * trebleAvg;
          const finalAngle = angle + wavePeriod * 0.012;

          const startX = cx + Math.cos(angle) * (energyRadius + 1.5);
          const startY = cy + Math.sin(angle) * (energyRadius + 1.5);
          const endX = cx + Math.cos(finalAngle) * (energyRadius + beamLen);
          const endY = cy + Math.sin(finalAngle) * (energyRadius + beamLen);

          ctx.strokeStyle = i % 3 === 0 ? primaryColor : i % 3 === 1 ? secondaryColor : accentColor;
          ctx.lineWidth = i % 6 === 0 ? 2.2 : 0.8;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        ctx.restore();
        ctx.shadowBlur = 0;
      }
    };

    render(lastTime);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
    };
  }, [analyser, activeMode, isPlaying, theme, config, particles]);

  // Handle Swipe actions for Mobile (Minimal gesture)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 100) {
        if (dx > 0) {
          // Swipe Right: Prev
          onPlayPrev();
        } else {
          // Swipe Left: Next
          onPlayNext();
        }
      }
    } else {
      if (Math.abs(dy) > 100) {
        if (dy > 0) {
          // Swipe Down: Close
          onClose();
        }
      }
    }
    touchStartRef.current = null;
  };

  // Convert track cover format
  const isProceduralSynth = currentTrack?.coverUrl === 'synthwave';

  return (
    <div 
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => setShowControls(prev => !prev)}
      className="fixed inset-0 z-50 overflow-hidden select-none bg-black flex items-center justify-center cursor-none"
      id="fullscreen-stage"
      style={{ cursor: showControls ? 'default' : 'none' }}
    >
      {/* Dynamic blurred cinema canvas behind */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center origin-center filter brightness-[0.25] transition-all duration-1000 scale-[1.08]"
        style={{ 
          backgroundImage: currentTrack?.coverUrl && !isProceduralSynth ? `url(${currentTrack.coverUrl})` : undefined,
          filter: `blur(${config.backgroundBlur}px) brightness(0.25)`
        }}
      />

      {/* Primary rendering Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-10 w-full h-full block" 
        id="fullscreen-visualizer-canvas"
      />

      {/* Floating album art layout (Modes with art configured) */}
      {config.artSize !== 'hidden' && activeMode !== 'ambient' && currentTrack && (
        <div 
          ref={artworkRef}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(); // Double click simulation or single tap favorite
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute z-20 flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
          id="central-artwork-shell"
        >
          <div 
            className="relative rounded-full overflow-hidden border border-white/10 group shadow-[0_0_50px_rgba(0,0,0,0.8)] aspect-square"
            style={{ 
              width: config.artSize === 'small' ? '180px' : config.artSize === 'medium' ? '280px' : '400px',
              animation: isPlaying ? 'floatAnimation 6s ease-in-out infinite' : 'none',
              boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 40px ${theme.primary}12`
            }}
          >
            {isProceduralSynth ? (
              <div className="w-full h-full bg-gradient-to-tr from-[#7c4dff] via-[#00e5ff] to-[#ff4d9d] flex items-center justify-center">
                <Music size={55} className="text-white animate-pulse" />
              </div>
            ) : currentTrack.coverUrl ? (
              <img 
                src={currentTrack.coverUrl} 
                alt="" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <Music size={45} className="text-zinc-600" />
              </div>
            )}
            
            {/* Soft inner aura glow overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
              <span className="text-[10px] bg-black/60 backdrop-blur border border-white/15 px-2 py-0.5 rounded text-white font-mono uppercase">
                {currentTrack.format}
              </span>
              <Heart 
                size={14} 
                className={isFavorited ? "fill-red-500 text-red-500" : "text-white"} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          UI GUEST HOVER OVERLAYS - TOP & BOTTOM CONTROL BARS
          ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && (
          <>
            {/* TOP HEADER: NAVIGATION & DISMISSAL */}
            <motion.div
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 left-0 right-0 z-30 p-6 flex items-center justify-between glassmorphism pointer-events-auto border-b border-white/[0.03]"
              id="fullscreen-nav-header"
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-sans font-black text-xs tracking-widest uppercase text-white">
                  NEON<span style={{ color: theme.secondary }}>WAVE</span> 2026
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-zinc-400 rounded px-2 py-0.5 font-mono">
                  CINEMATIC VISUAL ENGINE
                </span>
              </div>

              {/* Toolbar Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowPlaylist(prev => !prev);
                    if (showSettings) setShowSettings(false);
                  }}
                  className={`cursor-pointer p-2.5 rounded-lg transition-all border outline-none ${
                    showPlaylist 
                      ? 'bg-white/15 text-[#00e5ff] border-[#00e5ff]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]' 
                      : 'bg-black/30 text-zinc-400 hover:text-white border-white/5'
                  }`}
                  title="Cinematic Live Playlist Drawer"
                >
                  <ListMusic size={15} />
                </button>
                <button
                  onClick={() => {
                    setShowSettings(prev => !prev);
                    if (showPlaylist) setShowPlaylist(false);
                  }}
                  className={`cursor-pointer p-2.5 rounded-lg transition-all border outline-none ${
                    showSettings 
                      ? 'bg-white/15 text-white border-white/20' 
                      : 'bg-black/30 text-zinc-400 hover:text-white border-white/5'
                  }`}
                  title="Visualizer Studio Settings"
                >
                  <Settings size={15} />
                </button>
                <button
                  onClick={onClose}
                  className="cursor-pointer p-2.5 rounded-lg bg-[#ff4d9d]/15 hover:bg-[#ff4d9d]/30 text-[#ff4d9d] hover:text-white border border-[#ff4d9d]/20 transition-all outline-none"
                  title="Exit Fullscreen Cinematic Mode"
                >
                  <Minimize2 size={15} />
                </button>
              </div>
            </motion.div>

            {/* FLOATING GLASS SIDEBAR: MODE SELECTOR (Modes 1 - 10) */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-6 top-28 bottom-28 z-30 w-52 flex flex-col gap-1.5 p-3 rounded-2xl glassmorphism pointer-events-auto border border-white/5 max-h-[80vh] overflow-y-auto custom-scrollbar"
              id="visualizer-skin-scroller"
            >
              <h4 className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase mb-2 flex items-center gap-1">
                <Sliders size={11} className="text-[#00e5ff]" />
                <span>Render Engine</span>
              </h4>

              {Object.keys(DEFAULT_CONFIGS).map((itemKey) => {
                const isSelected = activeMode === itemKey;
                const configItem = DEFAULT_CONFIGS[itemKey as FullscreenMode];
                return (
                  <button
                    key={itemKey}
                    onClick={() => setActiveMode(itemKey as FullscreenMode)}
                    className={`cursor-pointer w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all duration-150 outline-none ${
                      isSelected 
                        ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span>{configItem.name}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping" />}
                  </button>
                );
              })}
            </motion.div>

            {/* LOWER GLASS CONTAINER: AUDIO PLAYER CONTROLLER */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 left-6 right-6 z-30 p-5 rounded-2xl glassmorphism border border-white/5 pointer-events-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
              id="immersive-control-deck"
            >
              {/* Cover & Audio Info */}
              <div className="flex items-center gap-4.5 md:w-1/3 min-w-[200px]" id="deck-metadata">
                {currentTrack && (
                  <>
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/10 shadow-lg">
                      {isProceduralSynth ? (
                        <div className="w-full h-full bg-gradient-to-tr from-[#7c4dff] to-[#00e5ff] flex items-center justify-center">
                          <Music size={20} className="text-white animate-spin-slow" />
                        </div>
                      ) : currentTrack.coverUrl ? (
                        <img 
                          src={currentTrack.coverUrl} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Music size={18} className="text-zinc-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold truncate text-white uppercase tracking-tight">
                        {currentTrack.title}
                      </h3>
                      <p className="text-xs truncate text-zinc-400 hover:text-white transition-colors">
                        {currentTrack.artist} — {currentTrack.album}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Floating controls */}
              <div className="flex flex-col gap-2 items-center flex-1" id="deck-central">
                {/* Micro control bar */}
                <div className="flex items-center gap-5">
                  <button 
                    onClick={onPlayPrev}
                    className="cursor-pointer text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all outline-none"
                    title="Previous Audio Track"
                  >
                    <SkipBack size={18} />
                  </button>

                  <button 
                    onClick={onTogglePlay}
                    className="cursor-pointer w-11 h-11 rounded-full flex items-center justify-center text-black bg-white hover:scale-105 active:scale-95 transition-all shadow-md outline-none"
                    style={{ backgroundColor: theme.primary }}
                    title={isPlaying ? "Pause Audio" : "Play Audio"}
                  >
                    {isPlaying ? <Pause size={18} className="text-black fill-black" /> : <Play size={18} className="translate-x-0.5 text-black fill-black" />}
                  </button>

                  <button 
                    onClick={onPlayNext}
                    className="cursor-pointer text-zinc-400 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-all outline-none"
                    title="Next Audio Track"
                  >
                    <SkipForward size={18} />
                  </button>
                  
                  <button
                    onClick={onToggleFavorite}
                    className="cursor-pointer text-zinc-400 hover:text-[#ff4d9d] p-1.5 rounded-full hover:bg-white/5 transition-all outline-none ml-2"
                    title="Toggle Favorite status"
                  >
                    <Heart size={16} className={isFavorited ? "fill-red-500 text-red-500" : ""} />
                  </button>
                </div>

                {/* Progress Sliders Row */}
                <div className="flex items-center gap-3 w-full max-w-xl text-[10.5px] font-mono text-zinc-400">
                  <span>{formatTime(playbackState.currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={playbackState.duration || 100}
                    step="1"
                    value={playbackState.currentTime}
                    onChange={(e) => onSeek(parseFloat(e.target.value))}
                    className="flex-1 h-1 select-none bg-white/10 rounded-lg appearance-none cursor-pointer outline-none transition-all"
                    style={{ accentColor: theme.primary }}
                  />
                  <span>{formatTime(playbackState.duration)}</span>
                </div>
              </div>

              {/* Volume Slider Segment */}
              <div className="hidden md:flex items-center justify-end gap-3 w-1/3 text-zinc-400" id="deck-right">
                <div className="flex items-center gap-2 max-w-[150px]">
                  <button onClick={onToggleMute} className="cursor-pointer text-zinc-400 hover:text-white transition-all outline-none">
                    {playbackState.isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={playbackState.isMuted ? 0 : playbackState.volume}
                    onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none"
                    style={{ accentColor: theme.primary }}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────
          FLOATING UI PANEL: CINEMATIC VISUALIZER STUDIO SETTINGS
          ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 top-28 bottom-28 z-40 w-80 glassmorphism border border-white/10 rounded-2xl p-5 pointer-events-auto flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar"
            id="v-settings-panel"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <SlidersHorizontal size={13} className="text-[#00e5ff]" />
                <span>Visual Studio Controls</span>
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="cursor-pointer text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Config items */}
            <div className="flex flex-col gap-3.5 text-xs">
              
              {/* Config wave Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Wave Tone Color Mapping</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['primary', 'secondary', 'accent', 'white'] as const).map((colorKey) => (
                    <button
                      key={colorKey}
                      onClick={() => setConfig(prev => ({ ...prev, waveColor: colorKey }))}
                      className={`cursor-pointer capitalize py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        config.waveColor === colorKey 
                          ? 'bg-white/10 text-white border-white/30' 
                          : 'bg-black/25 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      {colorKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Glow Strength */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Spectral Neon Glow Strength</span>
                  <span className="font-mono text-[10px] font-bold text-[#00e5ff]">{config.glowStrength}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="2"
                  value={config.glowStrength}
                  onChange={(e) => setConfig(prev => ({ ...prev, glowStrength: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none"
                  style={{ accentColor: theme.secondary }}
                />
              </div>

              {/* Background Blur */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Cinematic Background Blur</span>
                  <span className="font-mono text-[10px] font-bold text-[#00e5ff]">{config.backgroundBlur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="2"
                  value={config.backgroundBlur}
                  onChange={(e) => setConfig(prev => ({ ...prev, backgroundBlur: parseInt(e.target.value) }))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none"
                  style={{ accentColor: theme.secondary }}
                />
              </div>

              {/* Particle Count */}
              {activeMode !== 'minimal' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Universe Star Density</span>
                    <span className="font-mono text-[10px] font-bold text-[#00e5ff]">{config.particleCount} particles</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="220"
                    step="10"
                    value={config.particleCount}
                    onChange={(e) => setConfig(prev => ({ ...prev, particleCount: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none"
                    style={{ accentColor: theme.secondary }}
                  />
                </div>
              )}

              {/* Speed Factor */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Organic Movement Speed</span>
                  <span className="font-mono text-[10px] font-bold text-[#00e5ff]">{config.animationSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={config.animationSpeed}
                  onChange={(e) => setConfig(prev => ({ ...prev, animationSpeed: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer outline-none"
                  style={{ accentColor: theme.secondary }}
                />
              </div>

              {/* Wave details Artwork Size */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Central Artwork Sizing</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['hidden', 'small', 'medium', 'large'] as const).map((sizeKey) => (
                    <button
                      key={sizeKey}
                      onClick={() => setConfig(prev => ({ ...prev, artSize: sizeKey }))}
                      className={`cursor-pointer capitalize py-1 py-1.5 text-[9.5px] font-semibold rounded-lg border transition-all ${
                        config.artSize === sizeKey 
                          ? 'bg-white/10 text-white border-white/30' 
                          : 'bg-black/25 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      {sizeKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rendering FPS Limitation Target */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Core Refresh FPS Limit</label>
                <div className="flex gap-2">
                  {[30, 60].map((fpsVal) => (
                    <button
                      key={fpsVal}
                      onClick={() => setConfig(prev => ({ ...prev, fpsLimit: fpsVal as 30 | 60 }))}
                      className={`cursor-pointer flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        config.fpsLimit === fpsVal 
                          ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white border-violet-500' 
                          : 'bg-black/25 text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      {fpsVal} FPS (regulated)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Presets Action Deck */}
            <div className="border-t border-white/5 pt-4 mt-auto flex gap-2">
              <button
                onClick={handleResetConfig}
                className="cursor-pointer flex-1 py-2 text-[10px] font-bold border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all uppercase tracking-wider"
              >
                Reset Default
              </button>
              <button
                onClick={handleSaveConfig}
                className="cursor-pointer flex-1 py-2 text-[10px] font-bold rounded-lg bg-linear-to-r from-cyan-500 to-indigo-600 text-black font-semibold hover:scale-[1.03] active:scale-[0.98] transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                style={{ color: '#000000' }}
              >
                {isSavedNotify ? (
                  <>
                    <Check size={11} />
                    <span>Preset Saved!</span>
                  </>
                ) : (
                  <>
                    <Save size={11} />
                    <span>Save Custom</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────
          FLOATING UI PANEL: CINEMATIC LIVE PLAYLIST / QUEUE DRAWER
          ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && showPlaylist && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-6 top-28 bottom-28 z-40 w-80 glassmorphism border border-white/10 rounded-2xl p-5 pointer-events-auto flex flex-col gap-4 max-h-[75vh]"
            id="v-playlist-panel"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <ListMusic size={13} className="text-[#00e5ff]" />
                <span>Cinematic Playlist Queue</span>
              </h3>
              <button 
                onClick={() => setShowPlaylist(false)}
                className="cursor-pointer text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Track Queue list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <Music className="text-zinc-600 animate-pulse" size={24} />
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest">No Tracks Loaded</span>
                </div>
              ) : (
                playlist.map((track, idx) => {
                  const isActive = currentTrack?.id === track.id;
                  const synthCover = track.coverUrl === 'synthwave';
                  
                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => {
                        if (onSelectTrack) onSelectTrack(idx);
                      }}
                      className={`group/item cursor-pointer w-full p-2 rounded-xl flex items-center justify-between transition-all outline-none ${
                        isActive 
                          ? 'bg-linear-to-r from-cyan-600/25 to-blue-600/25 border border-[#00e5ff]/20 text-white shadow-[0_0_15px_rgba(0,229,255,0.05)]' 
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {/* Number or Equalizer animation / status */}
                        <div className="w-5 text-center flex-shrink-0 text-[10px] font-mono font-bold text-zinc-500 flex items-center justify-center">
                          {isActive && playbackState.isPlaying ? (
                            <div className="flex items-end justify-center gap-[2px] h-3.5 w-3 pb-[1px]">
                              <span className="w-[1.8px] bg-[#00e5ff] rounded-full animate-equalizer-bar-1" style={{ height: '70%', transformOrigin: 'bottom' }} />
                              <span className="w-[1.8px] bg-[#00e5ff] rounded-full animate-equalizer-bar-2" style={{ height: '100%', transformOrigin: 'bottom' }} />
                              <span className="w-[1.8px] bg-[#00e5ff] rounded-full animate-equalizer-bar-3" style={{ height: '50%', transformOrigin: 'bottom' }} />
                            </div>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Thumb */}
                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-zinc-900 border border-white/10">
                          {synthCover ? (
                            <div className="w-full h-full bg-gradient-to-tr from-[#7c4dff] to-[#00e5ff] flex items-center justify-center">
                              <Music size={12} className="text-white" />
                            </div>
                          ) : track.coverUrl ? (
                            <img 
                              src={track.coverUrl} 
                              alt="" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                              <Music size={12} className="text-zinc-500" />
                            </div>
                          )}
                        </div>

                        {/* Text */}
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className={`text-[11px] font-bold truncate ${isActive ? 'text-[#00e5ff]' : 'text-white'}`}>
                            {track.title}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-medium truncate">
                            {track.artist}
                          </span>
                        </div>
                      </div>

                      <div className="font-mono text-[9px] text-zinc-500 group-hover/item:text-zinc-300 pr-1 flex-shrink-0">
                        {track.duration || '0:00'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="border-t border-white/5 pt-2.5 text-[9px] text-zinc-500 flex justify-between uppercase font-mono tracking-wider">
              <span>Total tracks: {playlist.length}</span>
              <span className="text-[#00e5ff]">Auditory Stream</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────────────────────────────────────────────────────────
          FLOATING UI PANEL: COGNITIVE AUDIO METADATA ANALYZER
          ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showControls && showInfoOverlay && currentTrack && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-60 right-60 bottom-32 top-32 z-40 max-w-sm glassmorphism border border-white/10 rounded-2xl p-5 pointer-events-auto flex flex-col gap-3 font-mono text-[10px] text-zinc-300 max-h-[50vh] overflow-y-auto"
            id="v-info-modal"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-white font-bold text-xs flex items-center gap-1">
                <Sparkles size={11} className="text-[#00e5ff]" />
                <span>SPEC SIGNAL TELEMETRY</span>
              </span>
              <button onClick={() => setShowInfoOverlay(false)} className="cursor-pointer text-zinc-400 hover:text-white">
                <X size={13} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex justify-between"><span className="text-zinc-500">FORMAT DECODER:</span><span className="text-[#00e5ff] font-bold">{currentTrack.format}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">SAMPLE FREQUENCY:</span><span>{currentTrack.sampleRate || '44.1 kHz'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">QUANTIZATION DEPTH:</span><span>{currentTrack.bitDepth || '16-bit PCM'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">DECIBEL BITRATE:</span><span className="text-[#ff4d9d] font-bold">{currentTrack.bitrate || '320 kbps'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">AUDIO METRIC SIZE:</span><span>{currentTrack.size || 'Cached Stream'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">ACTIVE CHANNELS:</span><span>2 (Stereo Master)</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">BUFFER FFT COUNT:</span><span>{analyser ? analyser.fftSize : '256'}</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">GLOW STRENGTH:</span><span>{config.glowStrength}px</span></div>
              <div className="flex justify-between"><span className="text-zinc-500">STAR COUNT:</span><span>{config.particleCount} points</span></div>
            </div>
            <div className="text-[9px] text-zinc-500 text-center uppercase tracking-wide border-t border-white/5 pt-2 mt-auto">
              Hardware Accelerated Fourier Transform
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const y = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * y).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${isNaN(r) ? 0 : r}, ${isNaN(g) ? 0 : g}, ${isNaN(b) ? 0 : b}`;
}
