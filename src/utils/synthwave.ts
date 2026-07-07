// High-fidelity procedurally generated Synthwave loop engine
// Synthesizes analog-modeling synth sounds offline in the browser at the user's native sound card resolution (e.g., 24-bit/48kHz or higher).

export class SynthwaveEngine {
  private ctx: AudioContext;
  private dest: AudioNode;
  private isRunning: boolean = false;
  private intervalId: any = null;
  private nextNoteTime: number = 0.0;
  private currentStep: number = 0;
  private tempo: number = 115; // Retro-synth BPM
  private scheduleAheadTime: number = 0.1; // 100ms lookahead
  private lookaheadInterval: number = 25;  // Check every 25ms

  // Synthesizer master gain and filter structure
  private masterGain: GainNode;
  private filter: BiquadFilterNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayFilter: BiquadFilterNode;

  // Track bass scale progression
  private bassNotes: number[] = [
    36, 36, 36, 36, 36, 36, 36, 36, // C2
    39, 39, 39, 39, 39, 39, 39, 39, // Eb2
    34, 34, 34, 34, 34, 34, 34, 34, // Bb1
    38, 38, 38, 38, 41, 41, 41, 41  // D2 -> F2
  ];

  // Lead arpeggio sequence
  private leadSynthNotes: number[] = [
    60, 67, 72, 75, 79, 75, 72, 67, // C4 arpeggio
    63, 70, 75, 78, 82, 78, 75, 70, // Eb4 arpeggio
    58, 65, 70, 73, 77, 73, 70, 65, // Bb3 arpeggio
    62, 69, 74, 77, 81, 77, 74, 69  // D4 arpeggio
  ];

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;

    // Master bus
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, ctx.currentTime);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 1.0;
    this.filter.frequency.value = 2200;

    // Delay Bus
    this.delayNode = ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.33; // Dotted eighth note approx (approx 330ms at 115 BPM)
    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = 0.45;
    this.delayFilter = ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 1000;

    // Route audio path: Master -> Lowpass -> Destination
    this.masterGain.connect(this.filter);
    this.filter.connect(this.dest);

    // Route delay sends: Master -> Delay -> DelayFilter -> Feedback -> Delay -> Main
    this.masterGain.connect(this.delayNode);
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.dest); // Route wet signal to out
  }

  // Generate white noise buffer for snare and hi-hats
  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx.sampleRate * 1.5; // 1.5 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    // Schedule ticker Loop
    this.intervalId = setInterval(() => {
      this.scheduler();
    }, this.lookaheadInterval);

    // Automation over master filter frequency
    const now = this.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(1500, now);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.intervalId = null;
  }

  setVolume(vol: number) {
    this.masterGain.gain.setTargetAtTime(vol * 0.4, this.ctx.currentTime, 0.05);
  }

  private mtof(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  // Ticker checks if notes need scheduling
  private scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      if (this.isRunning) {
        this.scheduleStep(this.currentStep, this.nextNoteTime);
      }
      this.advanceStep();
    }
  }

  private advanceStep() {
    // 16 steps per bar
    const stepDuration = 60.0 / this.tempo / 4; // Length of 16th note
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 32; // 2 bars
  }

  private scheduleStep(step: number, time: number) {
    // 1. Kick Drum: plays on steps 0, 4, 8, 12, 16, 20, 24, 28
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // 2. Snare Drum: plays on steps 4, 12, 20, 28
    if (step % 8 === 4) {
      this.playSnare(time);
    }

    // 3. Hi-hats: open on offbeats (2, 6, 10, 14, 18, 22, 26, 30)
    if (step % 4 === 2) {
      this.playHihat(time, true);
    } else if (step % 2 === 1) {
      // Closed on other 16ths (low velocity)
      this.playHihat(time, false);
    }

    // 4. Bass Line: Constant pumping 8th notes (0, 2, 4, 6, 8, etc.)
    if (step % 2 === 0) {
      const idx = Math.floor(step / 2);
      const bassMidi = this.bassNotes[idx % this.bassNotes.length];
      this.playBass(bassMidi, time);
    }

    // 5. Arpeggiator Lead: 16th notes (dynamic patterns/melodies)
    // Plays some steps for cool rhythmic syncopation
    const stepsToPlayLead = [0, 1, 3, 4, 6, 7, 8, 10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 26, 28, 30];
    if (stepsToPlayLead.includes(step % 32)) {
      const leadMidi = this.leadSynthNotes[step % this.leadSynthNotes.length];
      this.playLead(leadMidi, time, step);
    }
  }

  // Synthesize Retro Kick Drum (frequency pitch sweep)
  private playKick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.linearRampToValueAtTime(0.01, time + 0.12);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  // Synthesize White-Noise Snare (rich retro snare with gate filter)
  private playSnare(time: number) {
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.createNoiseBuffer();

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 2.0;

    const noiseGain = this.ctx.createGain();

    // Body sine tone for low impact punch
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(180, time);
    bodyOsc.frequency.linearRampToValueAtTime(100, time + 0.07);

    bodyGain.gain.setValueAtTime(0.5, time);
    bodyGain.gain.linearRampToValueAtTime(0.01, time + 0.07);

    // Wired SNR paths
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.masterGain);

    noiseGain.gain.setValueAtTime(0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    noiseSource.start(time);
    noiseSource.stop(time + 0.25);

    bodyOsc.start(time);
    bodyOsc.stop(time + 0.1);
  }

  // Synthesize Hat with highpass filter
  private playHihat(time: number, isOpen: boolean) {
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = this.createNoiseBuffer();

    const hatFilter = this.ctx.createBiquadFilter();
    hatFilter.type = 'highpass';
    hatFilter.frequency.value = 7500;

    const hatGain = this.ctx.createGain();

    noiseSource.connect(hatFilter);
    hatFilter.connect(hatGain);
    hatGain.connect(this.masterGain);

    const volume = isOpen ? 0.22 : 0.1;
    const duration = isOpen ? 0.12 : 0.04;

    hatGain.gain.setValueAtTime(volume, time);
    hatGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noiseSource.start(time);
    noiseSource.stop(time + duration + 0.05);
  }

  // Driving analog-modeling bass oscillator
  private playBass(midiNote: number, time: number) {
    // Sawtooth with slight detuned triangle underneath
    const saw = this.ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(this.mtof(midiNote), time);

    const sub = this.ctx.createOscillator();
    sub.type = 'triangle';
    // Deep Sub octaved down
    sub.frequency.setValueAtTime(this.mtof(midiNote - 12), time);

    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(150, time);
    // Dynamic Filter envelope sweep (the synthwave "oww-oww" bass rhythm)
    bassFilter.frequency.exponentialRampToValueAtTime(650, time + 0.04);
    bassFilter.frequency.exponentialRampToValueAtTime(120, time + 0.14);

    const bassGain = this.ctx.createGain();
    bassGain.gain.setValueAtTime(0.6, time);
    bassGain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);

    saw.connect(bassFilter);
    sub.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.masterGain);

    saw.start(time);
    sub.start(time);

    saw.stop(time + 0.15);
    sub.stop(time + 0.15);
  }

  // Filtered glowing retro synth lead (arpeggiator)
  private playLead(midiNote: number, time: number, step: number) {
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    
    // Detuned sawtooth lead
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    const freq = this.mtof(midiNote);
    osc1.frequency.setValueAtTime(freq - 2, time); // detuned left
    osc2.frequency.setValueAtTime(freq + 2, time); // detuned right

    const leadGain = this.ctx.createGain();
    const peakVolume = 0.2 + (Math.sin(step * 0.4) * 0.05); // Modulate energy slightly
    leadGain.gain.setValueAtTime(peakVolume, time);
    
    const decay = 0.16 + (step % 3 === 0 ? 0.08 : 0); // Alternate note sustain
    leadGain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    // Warm envelope filter
    const leadFilter = this.ctx.createBiquadFilter();
    leadFilter.type = 'lowpass';
    leadFilter.frequency.setValueAtTime(900, time);
    leadFilter.frequency.exponentialRampToValueAtTime(2500, time + 0.03);
    leadFilter.frequency.exponentialRampToValueAtTime(800, time + decay);

    osc1.connect(leadFilter);
    osc2.connect(leadFilter);
    leadFilter.connect(leadGain);
    leadGain.connect(this.masterGain);

    osc1.start(time);
    osc2.start(time);

    osc1.stop(time + decay + 0.05);
    osc2.stop(time + decay + 0.05);
  }
}
