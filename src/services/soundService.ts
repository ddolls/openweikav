/* ==========================================================================
   OpenWeikav - Web Audio Mechanical Sound Synthesizer (100% Client-Side)
   Based on MontanaTypes Sound Engine
   ========================================================================== */

export type SoundType = 'thock' | 'clack' | 'clicky' | 'bubble' | 'typewriter' | 'off';

export interface SoundProfileOption {
  id: SoundType;
  label: string;
  description: string;
}

export const SOUND_PROFILES: SoundProfileOption[] = [
  { id: 'thock', label: 'Thock', description: 'Deep lubed linear sound (Weikav Moon White linear style)' },
  { id: 'clack', label: 'Clack', description: 'Crisp bottom-out sound (POM stem linear)' },
  { id: 'clicky', label: 'Clicky', description: 'Crisp mechanical click (Kailh Box White / Cherry Blue)' },
  { id: 'bubble', label: 'Bubble', description: 'Soft pop bubble feedback' },
  { id: 'typewriter', label: 'Typewriter', description: 'Heavy mechanical typewriter strike' },
  { id: 'off', label: 'Off', description: 'Muted keypress sound' },
];

export interface SoundState {
  enabled: boolean;
  soundType: SoundType;
  volume: number; // 0.0 to 1.0
}

type Listener = (state: SoundState) => void;

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private soundType: SoundType = 'thock';
  private volume: number = 0.5;
  private initialized: boolean = false;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const savedType = localStorage.getItem('openweikav_sound_type') as SoundType | null;
      const savedVol = localStorage.getItem('openweikav_sound_vol');
      const savedEnabled = localStorage.getItem('openweikav_sound_enabled');

      if (savedType && ['thock', 'clack', 'clicky', 'bubble', 'typewriter', 'off'].includes(savedType)) {
        this.soundType = savedType;
      }
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) this.volume = v;
      }
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
    } catch {
      // Ignore
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('openweikav_sound_type', this.soundType);
      localStorage.setItem('openweikav_sound_vol', this.volume.toString());
      localStorage.setItem('openweikav_sound_enabled', this.enabled.toString());
    } catch {
      // Ignore
    }
    this.notify();
  }

  public init(): void {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('[Sound] Web Audio API initialization blocked or unsupported', e);
    }
  }

  public getState(): SoundState {
    return {
      enabled: this.enabled,
      soundType: this.soundType,
      volume: this.volume,
    };
  }

  public setSoundType(type: SoundType): void {
    this.soundType = type;
    this.init();
    this.saveSettings();
    if (type !== 'off') {
      this.playKeypress(false);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.init();
    this.saveSettings();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const s = this.getState();
    this.listeners.forEach((fn) => fn(s));
  }

  public playKeypress(isError: boolean = false): void {
    if (!this.enabled || this.soundType === 'off' || this.volume <= 0) return;

    if (!this.ctx) {
      this.init();
      if (!this.ctx) return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const t = this.ctx.currentTime;

    if (isError) {
      this.playErrorSound(t);
      return;
    }

    switch (this.soundType) {
      case 'thock':
        this.playThock(t);
        break;
      case 'clicky':
        this.playClicky(t);
        break;
      case 'clack':
        this.playClack(t);
        break;
      case 'bubble':
        this.playBubble(t);
        break;
      case 'typewriter':
        this.playTypewriter(t);
        break;
      default:
        this.playThock(t);
    }
  }

  private playThock(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const baseFreq = 110 + (Math.random() * 20 - 10);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.05);

    gain.gain.setValueAtTime(this.volume * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);

    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(800 + Math.random() * 200, t);
    click.frequency.exponentialRampToValueAtTime(200, t + 0.015);
    clickGain.gain.setValueAtTime(this.volume * 0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    click.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    click.start(t);
    click.stop(t + 0.02);
  }

  private playClicky(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 1800 + (Math.random() * 400 - 200);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.025);

    gain.gain.setValueAtTime(this.volume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  private playClack(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const freq = 450 + (Math.random() * 80 - 40);
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.04);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.Q.setValueAtTime(2, t);

    gain.gain.setValueAtTime(this.volume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playBubble(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const freq = 500 + Math.random() * 300;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.8, t + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  private playTypewriter(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200 + Math.random() * 300, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.03);

    gain.gain.setValueAtTime(this.volume * 0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  private playErrorSound(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.085);
  }
}

export const soundService = new SoundService();

