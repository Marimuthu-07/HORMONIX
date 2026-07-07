/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song } from '../types';
import { db } from '../database/db';

/**
 * Generates a pleasant high-fidelity synthetic pentatonic chime chime WAV file in memory
 */
export function createToneWavBlob(durationSeconds: number, title: string): Blob {
  const sampleRate = 22050;
  const numChannels = 1;
  const bitsPerSample = 16;
  const duration = Math.min(durationSeconds || 30, 45); // Limit length to keep it snappy
  const numSamples = Math.floor(sampleRate * duration);
  const bufferLength = numSamples * 2;
  const fileLength = 44 + bufferLength;
  
  const buffer = new ArrayBuffer(fileLength);
  const view = new DataView(buffer);
  
  const writeString = (view: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM Format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // Harmonic pentatonic
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteDuration = 1.5;
    const noteIndex = Math.floor(t / noteDuration);
    const noteTime = t % noteDuration;
    
    const noteHash = Math.abs(Math.sin(hash + noteIndex) * 1000);
    const freq = notes[Math.floor(noteHash) % notes.length];
    
    let sample = Math.sin(2 * Math.PI * freq * t);
    sample += 0.5 * Math.sin(2 * Math.PI * (freq * 2) * t); // Octave
    sample += 0.25 * Math.sin(2 * Math.PI * (freq * 1.5) * t); // Harmony
    
    // Smooth decay volume envelope
    const env = Math.exp(-3 * noteTime);
    sample *= env;
    
    // Soft fade at start/end of stream
    if (t < 0.2) {
      sample *= (t / 0.2);
    } else if (t > duration - 0.5) {
      sample *= Math.max(0, (duration - t) / 0.5);
    }
    
    const intSample = Math.max(-1, Math.min(1, sample * 0.35)) * 32767;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

export type AudioEvent =
  | 'play'
  | 'pause'
  | 'stop'
  | 'timeupdate'
  | 'durationchange'
  | 'ended'
  | 'error'
  | 'volumechange'
  | 'ratechange'
  | 'buffering'
  | 'loaded'
  | 'song-transitioning'; // Fired when automatic crossfade begins

export type AudioEventListener = (event: AudioEvent, data?: any) => void;

/**
 * Professional High-Performance Web Audio & dual-channel HTML5 Playback Engine.
 * Supports:
 * - 10-Band Equalizer & Bass Boost
 * - Dynamics Compressor
 * - ReplayGain Auto-Normalization
 * - Seamless Gapless Preloading
 * - Smooth Multi-Second Crossfading Transitions
 */
class AudioEngine {
  private audioA: HTMLAudioElement;
  private audioB: HTMLAudioElement;
  private activeChannel: 'A' | 'B' = 'A';

  private context: AudioContext | null = null;
  private sourceA: MediaElementAudioSourceNode | null = null;
  private sourceB: MediaElementAudioSourceNode | null = null;
  
  private gainA: GainNode | null = null;
  private gainB: GainNode | null = null;
  
  private eqFilters: BiquadFilterNode[] = [];
  private bassBoostNode: BiquadFilterNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  public analyser: AnalyserNode | null = null;

  private currentSong: Song | null = null;
  private songA: Song | null = null;
  private songB: Song | null = null;

  private objectUrlA: string | null = null;
  private objectUrlB: string | null = null;

  private listeners: Set<AudioEventListener> = new Set();
  
  // State variables
  private globalVolume = 0.8;
  private isMutedState = false;
  private isBuffering = false;
  private playbackRate = 1.0;

  // Processing values
  private eqGains: number[] = Array(10).fill(0);
  private eqEnabled = false;
  private bassBoostLevel = 0; // 0 to 10
  private compressorEnabled = false;
  private crossfadeDuration = 4; // seconds
  private replayGainMode: 'off' | 'track' | 'album' = 'off';

  // Gain multipliers
  private replayGainA = 1.0;
  private replayGainB = 1.0;

  // Crossfade state
  private isCrossfading = false;
  private fadeProgress = 0.0; // 0 to 1
  private fadeAnimationFrameId: number | null = null;
  private hasTriggeredCrossfadeForCurrent = false;
  private hasTriggeredPreloadForCurrent = false;

  private getNextSongCallback: (() => Song | null) | null = null;

  constructor() {
    this.audioA = new Audio();
    this.audioA.crossOrigin = 'anonymous';
    this.audioB = new Audio();
    this.audioB.crossOrigin = 'anonymous';

    this.setupChannelListeners('A', this.audioA);
    this.setupChannelListeners('B', this.audioB);
  }

  public initAudioContext() {
    if (this.context) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass();

      // 1. Equalizer chain (10 Peaking filters connected in series)
      this.eqFilters = [];
      const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
      
      let lastNode: AudioNode | null = null;
      for (let i = 0; i < frequencies.length; i++) {
        const filter = this.context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = frequencies[i];
        filter.Q.value = 1.0;
        filter.gain.value = this.eqEnabled ? this.eqGains[i] : 0.0;
        this.eqFilters.push(filter);

        if (lastNode) {
          lastNode.connect(filter);
        }
        lastNode = filter;
      }

      // 2. Bass Boost node (Lowshelf filter)
      this.bassBoostNode = this.context.createBiquadFilter();
      this.bassBoostNode.type = 'lowshelf';
      this.bassBoostNode.frequency.value = 80;
      this.bassBoostNode.gain.value = this.bassBoostLevel * 1.5; // Amplify factor
      if (lastNode) {
        lastNode.connect(this.bassBoostNode);
      }

      // 3. Dynamics Compressor node
      this.compressorNode = this.context.createDynamicsCompressor();
      this.compressorNode.threshold.value = this.compressorEnabled ? -12 : 0;
      this.compressorNode.knee.value = 30;
      this.compressorNode.ratio.value = 12;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;
      this.bassBoostNode.connect(this.compressorNode);

      // 4. Analyser Node for stunning visualizers
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 512;
      this.compressorNode.connect(this.analyser);
      this.analyser.connect(this.context.destination);

      // 5. Dual Channel Crossfading Gain Nodes
      this.gainA = this.context.createGain();
      this.gainB = this.context.createGain();

      this.gainA.connect(this.eqFilters[0]);
      this.gainB.connect(this.eqFilters[0]);

      // Connect Media Elements
      this.sourceA = this.context.createMediaElementSource(this.audioA);
      this.sourceA.connect(this.gainA);

      this.sourceB = this.context.createMediaElementSource(this.audioB);
      this.sourceB.connect(this.gainB);

      this.updateChannelVolumes();
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by browser security policy:', e);
    }
  }

  private setupChannelListeners(channel: 'A' | 'B', audio: HTMLAudioElement) {
    audio.addEventListener('play', () => {
      if (this.activeChannel === channel) this.emit('play');
    });

    audio.addEventListener('pause', () => {
      if (this.activeChannel === channel && !this.isCrossfading) {
        this.emit('pause');
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (this.activeChannel === channel) {
        this.isBuffering = false;
        
        // Handle background triggers for preloading / crossfading
        this.handleTimeUpdate(audio.currentTime, audio.duration);

        this.emit('timeupdate', {
          currentTime: audio.currentTime,
          progress: (audio.currentTime / (audio.duration || 1)) * 100
        });
      }
    });

    audio.addEventListener('durationchange', () => {
      if (this.activeChannel === channel) {
        this.emit('durationchange', audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      if (this.activeChannel === channel) {
        if (!this.isCrossfading) {
          this.emit('ended');
        }
      }
    });

    audio.addEventListener('waiting', () => {
      if (this.activeChannel === channel) {
        this.isBuffering = true;
        this.emit('buffering', true);
      }
    });

    audio.addEventListener('playing', () => {
      if (this.activeChannel === channel) {
        this.isBuffering = false;
        this.emit('buffering', false);
      }
    });

    audio.addEventListener('volumechange', () => {
      if (this.activeChannel === channel) {
        this.emit('volumechange', {
          volume: this.globalVolume,
          muted: this.isMutedState
        });
      }
    });

    audio.addEventListener('ratechange', () => {
      if (this.activeChannel === channel) {
        this.emit('ratechange', this.playbackRate);
      }
    });

    audio.addEventListener('error', (e) => {
      if (this.activeChannel === channel) {
        this.emit('error', e);
      }
    });
  }

  /**
   * Register a callback to fetch the next track from the queue
   */
  public setNextSongCallback(callback: () => Song | null) {
    this.getNextSongCallback = callback;
  }

  /**
   * High precision real-time tracking for gapless & crossfade automation
   */
  private handleTimeUpdate(currentTime: number, duration: number) {
    if (!duration || this.isCrossfading) return;

    const timeRemaining = duration - currentTime;

    // 1. GAPLESS PRELOAD: Preload 10 seconds before the transition or 15 seconds before the end
    const preloadThreshold = Math.max(12, this.crossfadeDuration + 5);
    if (timeRemaining <= preloadThreshold && !this.hasTriggeredPreloadForCurrent) {
      this.hasTriggeredPreloadForCurrent = true;
      this.triggerPreload();
    }

    // 2. CROSSFADE TRIGGER
    if (this.crossfadeDuration > 0 && timeRemaining <= this.crossfadeDuration && !this.hasTriggeredCrossfadeForCurrent) {
      this.hasTriggeredCrossfadeForCurrent = true;
      this.triggerAutomaticCrossfade();
    }
  }

  private triggerPreload() {
    if (this.getNextSongCallback) {
      const nextSong = this.getNextSongCallback();
      if (nextSong) {
        this.preloadSong(nextSong);
      }
    }
  }

  private triggerAutomaticCrossfade() {
    if (this.getNextSongCallback) {
      const nextSong = this.getNextSongCallback();
      if (nextSong) {
        this.emit('song-transitioning', nextSong);
        this.loadSong(nextSong, true).catch((err) => {
          console.error('[AudioEngine] Fail to execute crossfade loading:', err);
        });
      }
    }
  }

  /**
   * Preload a song into the inactive channel so it's ready to transition with 0 latency
   */
  public async preloadSong(song: Song): Promise<void> {
    const inactiveChannel = this.activeChannel === 'A' ? 'B' : 'A';
    const targetAudio = inactiveChannel === 'A' ? this.audioA : this.audioB;

    if (inactiveChannel === 'A' && this.objectUrlA) {
      URL.revokeObjectURL(this.objectUrlA);
      this.objectUrlA = null;
    } else if (inactiveChannel === 'B' && this.objectUrlB) {
      URL.revokeObjectURL(this.objectUrlB);
      this.objectUrlB = null;
    }

    try {
      let audioBlob = await db.getSongAudio(song.id);
      if (!audioBlob) {
        audioBlob = createToneWavBlob(song.duration, song.title);
      }

      const url = URL.createObjectURL(audioBlob);
      if (inactiveChannel === 'A') {
        this.objectUrlA = url;
        this.songA = song;
        this.replayGainA = this.calculateReplayGain(song);
      } else {
        this.objectUrlB = url;
        this.songB = song;
        this.replayGainB = this.calculateReplayGain(song);
      }

      targetAudio.src = url;
      targetAudio.load();
      console.log(`[AudioEngine] Preloaded "${song.title}" on channel ${inactiveChannel}`);
    } catch (e) {
      console.warn('[AudioEngine] Preload failed:', e);
    }
  }

  /**
   * Load and prepare song
   */
  public async loadSong(song: Song, shouldCrossfade = false): Promise<void> {
    this.initAudioContext();
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }

    // Cancel any active crossfades
    if (this.fadeAnimationFrameId) {
      cancelAnimationFrame(this.fadeAnimationFrameId);
      this.fadeAnimationFrameId = null;
    }
    this.isCrossfading = false;

    const nextChannel = shouldCrossfade 
      ? (this.activeChannel === 'A' ? 'B' : 'A')
      : this.activeChannel;

    const targetAudio = nextChannel === 'A' ? this.audioA : this.audioB;
    const isPreloaded = nextChannel === 'A' 
      ? (this.songA?.id === song.id && this.objectUrlA)
      : (this.songB?.id === song.id && this.objectUrlB);

    this.hasTriggeredCrossfadeForCurrent = false;
    this.hasTriggeredPreloadForCurrent = false;

    try {
      if (!isPreloaded) {
        // Load fresh
        if (nextChannel === 'A' && this.objectUrlA) {
          URL.revokeObjectURL(this.objectUrlA);
          this.objectUrlA = null;
        } else if (nextChannel === 'B' && this.objectUrlB) {
          URL.revokeObjectURL(this.objectUrlB);
          this.objectUrlB = null;
        }

        let audioBlob = await db.getSongAudio(song.id);
        if (!audioBlob) {
          console.log(`[AudioEngine] Audio file blob not found for "${song.title}", generating high-fidelity synthesized stream...`);
          audioBlob = createToneWavBlob(song.duration, song.title);
        }

        const url = URL.createObjectURL(audioBlob);
        if (nextChannel === 'A') {
          this.objectUrlA = url;
          this.songA = song;
          this.replayGainA = this.calculateReplayGain(song);
        } else {
          this.objectUrlB = url;
          this.songB = song;
          this.replayGainB = this.calculateReplayGain(song);
        }

        targetAudio.src = url;
        targetAudio.load();
      }

      targetAudio.playbackRate = this.playbackRate;

      if (shouldCrossfade && this.crossfadeDuration > 0) {
        // Trigger multi-second visual crossfade
        this.currentSong = song;
        
        targetAudio.currentTime = 0;
        await targetAudio.play();
        
        this.startCrossfadeAnimation(this.crossfadeDuration, () => {
          // Completed crossfade
          this.emit('loaded', song);
        });
      } else {
        // Normal immediate swap
        const oldAudio = this.getActiveAudio();
        oldAudio.pause();
        oldAudio.currentTime = 0;

        this.activeChannel = nextChannel;
        this.currentSong = song;
        
        this.updateChannelVolumes();
        targetAudio.currentTime = 0;
        
        await targetAudio.play();
        this.emit('loaded', song);
      }
    } catch (err) {
      console.error('[AudioEngine] Loading error:', err);
      this.emit('error', err);
      throw err;
    }
  }

  private startCrossfadeAnimation(durationSec: number, onComplete: () => void) {
    this.isCrossfading = true;
    this.fadeProgress = 0.0;

    const startTimestamp = performance.now();
    const durationMs = durationSec * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTimestamp;
      this.fadeProgress = Math.min(1, elapsed / durationMs);

      this.updateChannelVolumes();

      if (this.fadeProgress < 1) {
        this.fadeAnimationFrameId = requestAnimationFrame(tick);
      } else {
        this.isCrossfading = false;
        this.fadeAnimationFrameId = null;

        // Clean up the old channel
        const oldChannel = this.activeChannel;
        const oldAudio = oldChannel === 'A' ? this.audioA : this.audioB;
        oldAudio.pause();
        oldAudio.currentTime = 0;

        // Permanently set next active channel
        this.activeChannel = this.activeChannel === 'A' ? 'B' : 'A';
        this.updateChannelVolumes();
        
        onComplete();
      }
    };

    this.fadeAnimationFrameId = requestAnimationFrame(tick);
  }

  public async play() {
    this.initAudioContext();
    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch (err) {
        console.warn('Failed to resume AudioContext on play:', err);
      }
    }
    
    this.getActiveAudio().play().catch((e) => {
      console.warn('Audio play request interrupted:', e);
    });

    if (this.isCrossfading) {
      this.getInactiveAudio().play().catch(console.warn);
    }
  }

  public pause() {
    this.getActiveAudio().pause();
    if (this.isCrossfading) {
      this.getInactiveAudio().pause();
    }
  }

  public stop() {
    this.audioA.pause();
    this.audioA.currentTime = 0;
    this.audioB.pause();
    this.audioB.currentTime = 0;
    
    if (this.fadeAnimationFrameId) {
      cancelAnimationFrame(this.fadeAnimationFrameId);
      this.fadeAnimationFrameId = null;
    }
    this.isCrossfading = false;
    
    this.emit('stop');
  }

  public seek(seconds: number) {
    const audio = this.getActiveAudio();
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
  }

  private getActiveAudio(): HTMLAudioElement {
    return this.activeChannel === 'A' ? this.audioA : this.audioB;
  }

  private getInactiveAudio(): HTMLAudioElement {
    return this.activeChannel === 'A' ? this.audioB : this.audioA;
  }

  private calculateReplayGain(song: Song): number {
    if (this.replayGainMode === 'off') return 1.0;

    // Use simulated or real ReplayGain data
    // Usually is an offset in dB, e.g. -6.5 dB. Ideal target volume is -14 LUFS or -18 LUFS.
    // Let's analyze artist or tracks and apply realistic normalization
    // Look up in song tags or fallback to a soft standard compression level for specific genres
    const hasGain = (song as any).replayGain !== undefined;
    const gainDb = hasGain ? (song as any).replayGain : (song.genre?.toLowerCase() === 'rock' || song.genre?.toLowerCase() === 'electronic' ? -5.0 : -2.0);
    
    // dB to factor: 10^(db/20)
    return Math.pow(10, gainDb / 20);
  }

  private updateChannelVolumes() {
    const vol = this.isMutedState ? 0 : this.globalVolume;

    if (this.context && this.gainA && this.gainB) {
      if (this.isCrossfading) {
        const outFactor = 1 - this.fadeProgress;
        const inFactor = this.fadeProgress;

        if (this.activeChannel === 'A') {
          // Channel A fades out, Channel B fades in
          this.gainA.gain.value = outFactor * vol * this.replayGainA;
          this.gainB.gain.value = inFactor * vol * this.replayGainB;
        } else {
          // Channel B fades out, Channel A fades in
          this.gainB.gain.value = outFactor * vol * this.replayGainB;
          this.gainA.gain.value = inFactor * vol * this.replayGainA;
        }
      } else {
        if (this.activeChannel === 'A') {
          this.gainA.gain.value = vol * this.replayGainA;
          this.gainB.gain.value = 0;
        } else {
          this.gainB.gain.value = vol * this.replayGainB;
          this.gainA.gain.value = 0;
        }
      }
    } else {
      // Direct element fallbacks
      if (this.activeChannel === 'A') {
        this.audioA.volume = vol * this.replayGainA;
        this.audioB.volume = 0;
      } else {
        this.audioB.volume = vol * this.replayGainB;
        this.audioA.volume = 0;
      }
    }
  }

  // --- CONTROLLER SETTERS ---

  public setVolume(volume: number) {
    this.globalVolume = Math.max(0, Math.min(volume, 1));
    this.updateChannelVolumes();
    this.emit('volumechange', {
      volume: this.globalVolume,
      muted: this.isMutedState
    });
  }

  public setMute(muted: boolean) {
    this.isMutedState = muted;
    this.updateChannelVolumes();
    this.emit('volumechange', {
      volume: this.globalVolume,
      muted: this.isMutedState
    });
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = Math.max(0.5, Math.min(rate, 2.0));
    this.audioA.playbackRate = this.playbackRate;
    this.audioB.playbackRate = this.playbackRate;
    this.emit('ratechange', this.playbackRate);
  }

  // --- AUDIO PROCESSING STAGES ---

  public setEqEnabled(enabled: boolean) {
    this.eqEnabled = enabled;
    if (this.eqFilters.length > 0) {
      for (let i = 0; i < this.eqFilters.length; i++) {
        const value = enabled ? this.eqGains[i] : 0.0;
        this.eqFilters[i].gain.value = value;
      }
    }
  }

  public setEqBands(gains: number[]) {
    this.eqGains = [...gains];
    if (this.eqEnabled && this.eqFilters.length === gains.length) {
      for (let i = 0; i < gains.length; i++) {
        this.eqFilters[i].gain.value = gains[i];
      }
    }
  }

  public setBassBoost(level: number) {
    this.bassBoostLevel = Math.max(0, Math.min(level, 10));
    if (this.bassBoostNode) {
      // Max bass boost of +15dB
      const dB = this.bassBoostLevel * 1.5;
      this.bassBoostNode.gain.value = dB;
    }
  }

  public setCompressorEnabled(enabled: boolean) {
    this.compressorEnabled = enabled;
    if (this.compressorNode) {
      // Toggle threshold to bypass or apply compression
      const thresh = enabled ? -15 : 0;
      this.compressorNode.threshold.value = thresh;
    }
  }

  public setCrossfadeDuration(duration: number) {
    this.crossfadeDuration = Math.max(0, Math.min(duration, 12));
  }

  public setReplayGainMode(mode: 'off' | 'track' | 'album') {
    this.replayGainMode = mode;
    
    // Re-evaluate ReplayGain levels for current playing tracks
    if (this.songA) this.replayGainA = this.calculateReplayGain(this.songA);
    if (this.songB) this.replayGainB = this.calculateReplayGain(this.songB);
    this.updateChannelVolumes();
  }

  // --- ACCESSORS ---

  public getCurrentSong(): Song | null {
    return this.currentSong;
  }

  public getCurrentTime(): number {
    return this.getActiveAudio().currentTime;
  }

  public getDuration(): number {
    return this.getActiveAudio().duration || 0;
  }

  public getVolume(): number {
    return this.globalVolume;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public getBufferedProgress(): number {
    const audio = this.getActiveAudio();
    if (audio.buffered.length === 0) return 0;
    const end = audio.buffered.end(audio.buffered.length - 1);
    return (end / (audio.duration || 1)) * 100;
  }

  // --- EVENT EMITTER ---

  public addEventListener(listener: AudioEventListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public removeEventListener(listener: AudioEventListener) {
    this.listeners.delete(listener);
  }

  private emit(event: AudioEvent, data?: any) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (err) {
        console.error('Error in AudioEngine listener:', err);
      }
    });
  }
}

export const audioEngine = new AudioEngine();
