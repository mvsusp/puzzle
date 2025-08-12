/**
 * AudioSystem - Main audio system coordinator
 * Manages the AudioEngine, MusicSystem, and SoundEffectManager
 */

import { AudioEngine, AudioSettings } from './AudioEngine';
import { MusicSystem, MusicTrack } from './MusicSystem';
import { SoundEffectManager, SfxType } from './SoundEffectManager';

export type { MusicTrack, SfxType, AudioSettings };

export class AudioSystem {
  private audioEngine: AudioEngine;
  private musicSystem: MusicSystem;
  private sfxManager: SoundEffectManager;
  
  private initialized = false;

  constructor() {
    this.audioEngine = new AudioEngine();
    this.musicSystem = new MusicSystem(this.audioEngine);
    this.sfxManager = new SoundEffectManager(this.audioEngine);
  }

  /**
   * Initialize the audio system (must be called after user interaction)
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.audioEngine.initialize();
      
      if (this.audioEngine.isReady()) {
        // Load all audio assets
        await Promise.all([
          this.musicSystem.loadAllTracks(),
          this.sfxManager.loadAllSfx()
        ]);
        
        this.initialized = true;
        console.log('AudioSystem initialized successfully');
      } else {
        console.warn('AudioEngine failed to initialize, audio disabled');
      }
      
    } catch (error) {
      console.error('Failed to initialize AudioSystem:', error);
    }
  }

  /**
   * Check if audio system is ready
   */
  public isReady(): boolean {
    return this.initialized && this.audioEngine.isReady();
  }

  // Music System Methods
  /**
   * Play background music
   */
  public async playMusic(track: MusicTrack, fadeInDuration?: number): Promise<void> {
    if (!this.isReady()) return;
    await this.musicSystem.play(track, fadeInDuration);
  }

  /**
   * Stop background music
   */
  public stopMusic(fadeOutDuration?: number): void {
    if (!this.isReady()) return;
    this.musicSystem.stop(fadeOutDuration);
  }

  /**
   * Crossfade to new music track
   */
  public async crossfadeMusic(newTrack: MusicTrack, duration?: number): Promise<void> {
    if (!this.isReady()) return;
    await this.musicSystem.crossfade(newTrack, duration);
  }

  /**
   * Pause background music
   */
  public pauseMusic(): void {
    if (!this.isReady()) return;
    this.musicSystem.pause();
  }

  /**
   * Resume background music
   */
  public async resumeMusic(): Promise<void> {
    if (!this.isReady()) return;
    await this.musicSystem.resume();
  }

  /**
   * Get current music track
   */
  public getCurrentMusicTrack(): MusicTrack | null {
    return this.musicSystem.getCurrentTrack();
  }

  public isMusicPlaying(): boolean {
    return this.musicSystem.isCurrentlyPlaying();
  }

  public isMusicPaused(): boolean {
    return this.musicSystem.isCurrentlyPaused();
  }

  // Sound Effect Methods
  /**
   * Play a sound effect
   */
  public playSfx(sfxType: SfxType, volume?: number, pitch?: number): boolean {
    if (!this.isReady()) return false;
    return this.sfxManager.play(sfxType, volume, pitch);
  }

  /**
   * Play chain sound effect
   */
  public playChain(chainCount: number, comboCount: number): boolean {
    if (!this.isReady()) return false;
    return this.sfxManager.playChain(chainCount, comboCount);
  }

  /**
   * Play fanfare sound effect
   */
  public playFanfare(level: number): boolean {
    if (!this.isReady()) return false;
    return this.sfxManager.playFanfare(level);
  }

  /**
   * Stop all sounds of a specific type
   */
  public stopSfxType(sfxType: SfxType): void {
    if (!this.isReady()) return;
    this.sfxManager.stopType(sfxType);
  }

  /**
   * Stop all sound effects
   */
  public stopAllSfx(): void {
    if (!this.isReady()) return;
    this.sfxManager.stopAll();
  }

  // Volume and Settings
  /**
   * Set volume for different audio types
   */
  public setVolume(type: 'master' | 'music' | 'sfx', value: number): void {
    this.audioEngine.setVolume(type, value);
  }

  /**
   * Get volume setting
   */
  public getVolume(type: 'master' | 'music' | 'sfx'): number {
    return this.audioEngine.getVolume(type);
  }

  /**
   * Enable/disable audio
   */
  public setEnabled(enabled: boolean): void {
    this.audioEngine.setEnabled(enabled);
  }

  public isEnabled(): boolean {
    return this.audioEngine.isEnabled();
  }

  /**
   * Get current audio settings
   */
  public getSettings(): AudioSettings {
    return this.audioEngine.getSettings();
  }

  /**
   * Apply audio settings
   */
  public applySettings(settings: Partial<AudioSettings>): void {
    this.audioEngine.applySettings(settings);
  }

  // System Management
  /**
   * Resume audio context (call on user interaction or game focus)
   */
  public async resume(): Promise<void> {
    await this.audioEngine.resume();
  }

  /**
   * Suspend audio context (call on game pause or blur)
   */
  public async suspend(): Promise<void> {
    await this.audioEngine.suspend();
  }

  /**
   * Maintenance - cleanup old sound effects
   */
  public update(): void {
    if (this.isReady()) {
      this.sfxManager.cleanup();
    }
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): {
    initialized: boolean;
    audioEngineReady: boolean;
    currentTrack: string | null;
    musicPlaying: boolean;
    musicPaused: boolean;
    playingSfxCount: number;
    settings: AudioSettings;
  } {
    return {
      initialized: this.initialized,
      audioEngineReady: this.audioEngine.isReady(),
      currentTrack: this.musicSystem.getCurrentTrack(),
      musicPlaying: this.musicSystem.isCurrentlyPlaying(),
      musicPaused: this.musicSystem.isCurrentlyPaused(),
      playingSfxCount: this.sfxManager.getPlayingCount(),
      settings: this.audioEngine.getSettings()
    };
  }

  /**
   * Cleanup and dispose all resources
   */
  public dispose(): void {
    this.musicSystem.dispose();
    this.sfxManager.dispose();
    this.audioEngine.dispose();
    this.initialized = false;
    
    console.log('AudioSystem disposed');
  }
}