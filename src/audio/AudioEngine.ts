/**
 * AudioEngine - Core audio system using Web Audio API
 * Handles audio context management, volume control, and audio pooling
 */

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  enabled: boolean;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  private settings: AudioSettings = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    enabled: true
  };
  
  private initialized = false;
  private audioPool: Map<string, AudioBuffer> = new Map();

  constructor() {
    // Initialize will be called later to handle user interaction requirements
  }

  /**
   * Initialize the audio engine - must be called after user interaction
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create audio context
      this.context = new (window.AudioContext || (window as typeof window & {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
      
      // Create gain nodes for volume control
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      
      // Connect gain nodes
      this.masterGain.connect(this.context.destination);
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      
      // Apply initial volume settings
      this.updateVolumes();
      
      // Resume context if suspended (required by many browsers)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      
      this.initialized = true;
      console.log('AudioEngine initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize AudioEngine:', error);
      this.settings.enabled = false;
    }
  }

  /**
   * Check if audio engine is ready for use
   */
  public isReady(): boolean {
    return this.initialized && this.context !== null && this.settings.enabled;
  }

  /**
   * Get the audio context
   */
  public getContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Get gain nodes for different audio types
   */
  public getMusicGain(): GainNode | null {
    return this.musicGain;
  }

  public getSfxGain(): GainNode | null {
    return this.sfxGain;
  }

  /**
   * Load and store an audio buffer
   */
  public async loadAudio(name: string, url: string): Promise<AudioBuffer> {
    if (!this.context) {
      throw new Error('AudioEngine not initialized');
    }

    // Check if already loaded
    const cached = this.audioPool.get(name);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      this.audioPool.set(name, audioBuffer);
      return audioBuffer;
      
    } catch (error) {
      console.error(`Failed to load audio ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a loaded audio buffer
   */
  public getAudio(name: string): AudioBuffer | null {
    return this.audioPool.get(name) || null;
  }

  /**
   * Create an audio source from buffer
   */
  public createSource(buffer: AudioBuffer): AudioBufferSourceNode | null {
    if (!this.context) {
      return null;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    return source;
  }

  /**
   * Update volume settings
   */
  public setVolume(type: 'master' | 'music' | 'sfx', value: number): void {
    value = Math.max(0, Math.min(1, value)); // Clamp between 0-1
    
    switch (type) {
      case 'master':
        this.settings.masterVolume = value;
        break;
      case 'music':
        this.settings.musicVolume = value;
        break;
      case 'sfx':
        this.settings.sfxVolume = value;
        break;
    }
    
    this.updateVolumes();
  }

  /**
   * Get current volume setting
   */
  public getVolume(type: 'master' | 'music' | 'sfx'): number {
    switch (type) {
      case 'master':
        return this.settings.masterVolume;
      case 'music':
        return this.settings.musicVolume;
      case 'sfx':
        return this.settings.sfxVolume;
      default:
        return 0;
    }
  }

  /**
   * Enable/disable audio
   */
  public setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.updateVolumes();
  }

  public isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Get current audio settings
   */
  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  /**
   * Apply settings
   */
  public applySettings(settings: Partial<AudioSettings>): void {
    Object.assign(this.settings, settings);
    this.updateVolumes();
  }

  /**
   * Update all gain node volumes
   */
  private updateVolumes(): void {
    if (!this.masterGain || !this.musicGain || !this.sfxGain) {
      return;
    }

    const masterVolume = this.settings.enabled ? this.settings.masterVolume : 0;
    
    this.masterGain.gain.setValueAtTime(masterVolume, this.context!.currentTime);
    this.musicGain.gain.setValueAtTime(this.settings.musicVolume, this.context!.currentTime);
    this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.context!.currentTime);
  }

  /**
   * Resume audio context (call on user interaction)
   */
  public async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Suspend audio context
   */
  public async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') {
      await this.context.suspend();
    }
  }

  /**
   * Cleanup and dispose resources
   */
  public dispose(): void {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
    
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.audioPool.clear();
    this.initialized = false;
    
    console.log('AudioEngine disposed');
  }
}