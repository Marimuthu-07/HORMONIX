import { Track } from '../types';

export const DefaultTracks: Track[] = [
  {
    id: 'synth-loop',
    title: 'Neon Wave Horizon',
    artist: 'NEONWAVE Engine',
    album: 'Zero Ingress Synthesis',
    duration: 300,
    url: 'synthwave://procedural',
    coverUrl: 'synthwave',  // Key flag for rendering procedural graphics
    format: 'SYNTH',
    sampleRate: '96.0 kHz',
    bitDepth: '32-bit Float',
    bitrate: '3072 kbps',
    size: 'Procedural Feed'
  }
];
