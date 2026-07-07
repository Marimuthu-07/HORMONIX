import { useEffect, useRef, useState } from 'react';
import { Theme } from '../types';
import { Sparkles, Activity, BarChart2, Radio } from 'lucide-react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  theme: Theme;
  isPlaying: boolean;
}

export type VisualizerMode = 'laser' | 'bars' | 'halo';

export default function Visualizer({ analyser, theme, isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [visMode, setVisMode] = useState<VisualizerMode>('bars');
  const [sensitivity, setSensitivity] = useState<number>(1.2);

  // Peak holding array for bars
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions with high-DPI scaling
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

    const render = () => {
      if (!canvas || !ctx) return;
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!analyser || !isPlaying) {
        // Draw idle line (flat scope)
        ctx.beginPath();
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = theme.primary;
        ctx.moveTo(0, height / 2);
        
        // Slight idle wave
        for (let i = 0; i < width; i++) {
          const y = height / 2 + Math.sin(i * 0.05 + Date.now() * 0.005) * 3;
          ctx.lineTo(i, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        animationRef.current = requestAnimationFrame(render);
        return;
      }

      // If playing, query analyzer
      const bufferLength = analyser.frequencyBinCount;

      if (visMode === 'laser') {
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.beginPath();
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme.primary;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0; // Normalized
          const amplitude = (v - 1) * sensitivity;
          const y = (amplitude * (height / 2)) + (height / 2);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.stroke();

        // Overlay secondary color thin beam in center for luxury lasers
        ctx.shadowBlur = 0;
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1;
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = ((v - 1) * sensitivity * (height / 2)) + (height / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

      } else if (visMode === 'bars') {
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 2.2;
        const spacing = 3;
        const totalBars = Math.min(Math.floor(width / (barWidth + spacing)), 64);

        // Manage peak decay
        if (peaksRef.current.length !== totalBars) {
          peaksRef.current = new Array(totalBars).fill(0);
        }

        ctx.shadowBlur = 0;

        for (let i = 0; i < totalBars; i++) {
          // Downsample bin ranges or boost bass/treble
          const binIndex = Math.min(Math.floor(i * (bufferLength / totalBars) * 0.75), bufferLength - 1);
          let barHeight = (dataArray[binIndex] / 255) * height * 0.95 * sensitivity;

          // Cap height
          if (barHeight > height) barHeight = height;

          const x = i * (barWidth + spacing) + (width - totalBars * (barWidth + spacing)) / 2;
          const y = height - barHeight;

          // Peak holding logic
          if (barHeight > peaksRef.current[i]) {
            peaksRef.current[i] = barHeight;
          } else {
            peaksRef.current[i] -= 1.5; // decay
            if (peaksRef.current[i] < 0) peaksRef.current[i] = 0;
          }

          // Draw glow gradient under the bar
          const gradient = ctx.createLinearGradient(x, height, x, y);
          gradient.addColorStop(0, `${theme.secondary}22`); // Semi-transparent
          gradient.addColorStop(0.5, `${theme.primary}aa`);
          gradient.addColorStop(1, theme.primary);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          // Draw floating peak dot
          const peakY = height - peaksRef.current[i] - 4;
          if (peakY < height - 2) {
            ctx.fillStyle = theme.accent;
            ctx.beginPath();
            ctx.arc(x + barWidth / 2, peakY, Math.max(1.5, barWidth / 3), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (visMode === 'halo') {
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Circular spiral mandala in center
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Base pulsar sizing based on average frequency amp
        let sum = 0;
        for (let i = 0; i < 32; i++) sum += dataArray[i];
        const averageAmp = sum / 32;
        const baseRadius = Math.min(width, height) * 0.22 + (averageAmp / 255) * 20 * sensitivity;

        ctx.shadowBlur = 10 + (averageAmp / 255) * 20;
        ctx.shadowColor = theme.primary;

        // Draw outer glowing halo orbits
        const numBeams = 80;
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = theme.primary;

        for (let i = 0; i < numBeams; i++) {
          const angle = (i / numBeams) * Math.PI * 2;
          const dataVal = dataArray[Math.floor(i * (bufferLength / numBeams) * 0.6)] || 0;
          const val = (dataVal / 255) * 55 * sensitivity;
          const r = baseRadius + val;

          const startX = centerX + Math.cos(angle) * baseRadius;
          const startY = centerY + Math.sin(angle) * baseRadius;
          const endX = centerX + Math.cos(angle) * r;
          const endY = centerY + Math.sin(angle) * r;

          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
        }
        ctx.stroke();

        // Secondary inner pulsing ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius - 8, 0, Math.PI * 2);
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = theme.accent;
        ctx.stroke();

        ctx.shadowBlur = 0; // Reset
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.unobserve(canvas);
    };
  }, [analyser, visMode, sensitivity, isPlaying, theme]);

  return (
    <div className="flex flex-col gap-2 w-full h-full justify-between" id="visualizer-container">
      {/* Visualizer Canvas Card */}
      <div className="relative w-full flex-grow rounded-xl overflow-hidden bg-black/40 border border-white/5 backdrop-blur-md min-h-[140px] flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" id="visual-canvas" />
        
        {/* Playback Format Detail Label */}
        {analyser && isPlaying && (
          <div className="absolute top-3 right-3 text-[10px] font-mono select-none px-2 py-0.5 rounded-full border bg-black/60 backdrop-blur-md transition-colors duration-300"
            style={{ color: theme.accent, borderColor: `${theme.accent}33` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current" />
            REALTIME ANALYSING
          </div>
        )}
      </div>

      {/* Control row for rendering modes */}
      <div className="flex items-center justify-between px-1" id="visualizer-ctrl-row">
        <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/5">
          <button
            onClick={() => setVisMode('bars')}
            className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              visMode === 'bars' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
            style={visMode === 'bars' ? { color: theme.primary } : {}}
            title="Spectrum Analyzer">
            <BarChart2 size={13} />
            <span className="hidden sm:inline">Bars</span>
          </button>
          <button
            onClick={() => setVisMode('laser')}
            className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              visMode === 'laser' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
            style={visMode === 'laser' ? { color: theme.primary } : {}}
            title="Laser Oscilloscope">
            <Activity size={13} />
            <span className="hidden sm:inline">Beam</span>
          </button>
          <button
            onClick={() => setVisMode('halo')}
            className={`cursor-pointer px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              visMode === 'halo' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
            }`}
            style={visMode === 'halo' ? { color: theme.primary } : {}}
            title="Orbit Ring">
            <Radio size={13} />
            <span className="hidden sm:inline">Orb</span>
          </button>
        </div>

        {/* Sensitivity slider */}
        <div className="flex items-center gap-2">
          <Sparkles size={11} className="text-slate-400" />
          <span className="text-[10px] font-mono text-slate-400 uppercase hidden xs:inline">Gain</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-16 h-1 rounded-lg appearance-none cursor-pointer bg-slate-800"
            style={{ accentColor: theme.primary }}
          />
        </div>
      </div>
    </div>
  );
}
